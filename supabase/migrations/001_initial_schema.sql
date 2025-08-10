-- Echo Database Schema
-- Initial migration for anonymous peer feedback platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable RLS globally
ALTER DATABASE postgres SET row_security = on;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (feedback collection sessions)
CREATE TABLE public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  focus_topics TEXT[] NOT NULL, -- Array of focus areas
  custom_questions TEXT[], -- 0-3 custom questions from user
  generated_questions TEXT[], -- 5 total questions (custom + AI generated)
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitations table
CREATE TABLE public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT, -- e.g., "colleague", "direct report", "manager"
  department TEXT,
  token TEXT UNIQUE NOT NULL, -- Secure invitation token
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'started', 'completed', 'expired')),
  opened_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audio interviews table
CREATE TABLE public.interviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE NOT NULL,
  livekit_room_name TEXT NOT NULL,
  livekit_participant_token TEXT,
  audio_url TEXT, -- Temporary storage URL (deleted after transcription)
  transcript_raw TEXT, -- Raw transcript before anonymization
  transcript_anonymized TEXT, -- Anonymized transcript (permanent)
  duration_seconds INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'no_show')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI conversation logs (for debugging and improvement)
CREATE TABLE public.ai_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('scope_scout', 'deep_dive', 'clarity_core')),
  conversation_log JSONB NOT NULL, -- Store full conversation for analysis
  performance_metrics JSONB, -- Response times, quality scores, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  content JSONB NOT NULL, -- Structured report data
  pdf_url TEXT, -- Generated PDF report URL
  insights TEXT[], -- Key insights extracted
  smart_actions TEXT[], -- SMART action items
  completion_rate DECIMAL(3,2), -- Percentage of invitees who completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-up tracking
CREATE TABLE public.follow_ups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('30_day_check', 'nps_survey')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  response_data JSONB, -- Store follow-up responses
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'completed', 'opted_out')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security Policies

-- Users can only see/edit their own data
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Sessions: users can only see/edit their own sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Invitations: users can see invitations for their sessions
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invitations for their sessions" ON public.invitations
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create invitations for their sessions" ON public.invitations
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update invitations for their sessions" ON public.invitations
  FOR UPDATE USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

-- Public access for invitation tokens (anonymous invitees)
CREATE POLICY "Anonymous access via valid token" ON public.invitations
  FOR SELECT USING (token IS NOT NULL);

-- Interviews: users can see interviews for their sessions
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view interviews for their sessions" ON public.interviews
  FOR SELECT USING (
    invitation_id IN (
      SELECT i.id FROM public.invitations i
      JOIN public.sessions s ON i.session_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- AI conversations: users can see logs for their sessions
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view AI logs for their sessions" ON public.ai_conversations
  FOR SELECT USING (
    interview_id IN (
      SELECT i.id FROM public.interviews i
      JOIN public.invitations inv ON i.invitation_id = inv.id
      JOIN public.sessions s ON inv.session_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- Reports: users can only see reports for their sessions
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view reports for their sessions" ON public.reports
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

-- Follow-ups: users can see follow-ups for their sessions
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view follow-ups for their sessions" ON public.follow_ups
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_invitations_session_id ON public.invitations(session_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_interviews_invitation_id ON public.interviews(invitation_id);
CREATE INDEX idx_interviews_status ON public.interviews(status);
CREATE INDEX idx_ai_conversations_interview_id ON public.ai_conversations(interview_id);
CREATE INDEX idx_reports_session_id ON public.reports(session_id);
CREATE INDEX idx_follow_ups_session_id ON public.follow_ups(session_id);
CREATE INDEX idx_follow_ups_scheduled_for ON public.follow_ups(scheduled_for);

-- Functions

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_sessions
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_invitations
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_interviews
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user creation (triggered by auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
  length INTEGER := 32;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate invitation tokens
CREATE OR REPLACE FUNCTION public.set_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := public.generate_invitation_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invitation token generation
CREATE TRIGGER set_invitation_token
  BEFORE INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_invitation_token();