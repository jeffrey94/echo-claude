# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                       │
│                    Next.js 14 PWA                          │
│              (Vercel Edge Functions)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                   API Gateway Layer                        │
│                 Supabase Edge Functions                    │
│                    + Next.js API Routes                    │
└─────────┬───────────────────┬───────────────────────────────┘
          │                   │
┌─────────┴─────────┐    ┌────┴─────────────────────────────┐
│   Authentication  │    │        Core Services             │
│   & Authorization │    │                                  │
│   (Supabase Auth) │    │ ┌─────────────┐ ┌─────────────┐ │
└───────────────────┘    │ │ Session Mgmt│ │ Email Service│ │
                         │ └─────────────┘ └─────────────┘ │
┌─────────────────────┐  │ ┌─────────────┐ ┌─────────────┐ │
│    AI Agents        │  │ │ Privacy Svc │ │ PDF Gen     │ │
│                     │  │ └─────────────┘ └─────────────┘ │
│ ┌─────────────────┐ │  └──────────────────────────────────┘
│ │   ScopeScout    │ │
│ │ (Question Gen)  │ │  ┌──────────────────────────────────┐
│ └─────────────────┘ │  │          LiveKit Cloud          │
│ ┌─────────────────┐ │  │      Audio Infrastructure       │
│ │    DeepDive     │ │  │                                  │
│ │ (Interview Bot) │ │  │ ┌─────────────┐ ┌─────────────┐ │
│ └─────────────────┘ │  │ │ Audio Rooms │ │ Transcription│ │
│ ┌─────────────────┐ │  │ └─────────────┘ └─────────────┘ │
│ │  ClarityCore    │ │  └──────────────────────────────────┘
│ │ (Report Gen)    │ │
│ └─────────────────┘ │  ┌──────────────────────────────────┐
└─────────────────────┘  │         Data Layer               │
                         │        Supabase Postgres         │
                         │                                  │
                         │ ┌─────────────┐ ┌─────────────┐ │
                         │ │   Tables    │ │   Storage   │ │
                         │ │   + RLS     │ │   (Files)   │ │
                         │ └─────────────┘ └─────────────┘ │
                         └──────────────────────────────────┘
```

## Core Components

### 1. Frontend Layer (Next.js PWA)
**Responsibility**: User interface and client-side logic
- **Session Wizard**: Multi-step form for session creation
- **Dashboard**: Progress tracking and report access
- **Audio Interface**: LiveKit integration with waveform display
- **PWA Shell**: Offline capabilities and app-like experience

**Key Files**:
- `app/dashboard/page.tsx` - Main dashboard
- `app/session/create/page.tsx` - Session creation wizard
- `app/interview/[token]/page.tsx` - Audio interview interface
- `components/audio/` - Audio-related components

### 2. API Layer (Next.js + Supabase)
**Responsibility**: Business logic and external service coordination

#### Next.js API Routes
- `api/sessions/` - Session CRUD operations
- `api/invitations/` - Email sending and tracking
- `api/reports/` - Report generation triggers
- `api/webhooks/` - External service webhooks

#### Supabase Edge Functions
- `functions/generate-questions/` - AI question generation
- `functions/process-transcript/` - Privacy processing
- `functions/generate-report/` - Report compilation

### 3. AI Agent Services
**Responsibility**: Intelligent conversation and analysis

#### ScopeScout (Question Generation)
```typescript
interface ScopeScoutRequest {
  focusTopics: string[];
  customQuestions: string[];
  context: SessionContext;
}
```

#### DeepDive (Interview Conductor)
```typescript
interface DeepDiveSession {
  sessionId: string;
  inviteeId: string;
  questions: Question[];
  currentQuestionIndex: number;
}
```

#### ClarityCore (Report Generator)
```typescript
interface ClarityCoreInput {
  transcripts: AnonymizedTranscript[];
  sessionMetadata: SessionMetadata;
  inviteeProfiles: InviteeProfile[];
}
```

### 4. Audio Infrastructure (LiveKit)
**Responsibility**: Real-time audio communication

#### Room Management
- Dynamic room creation per interview
- Automatic cleanup after session
- Token-based access control

#### Audio Processing
- Real-time transcription pipeline
- Waveform visualization data
- Audio quality monitoring

### 5. Privacy & Security Layer
**Responsibility**: Data protection and anonymization

#### Differential Privacy Service
```typescript
interface PrivacyProcessor {
  anonymizeTranscript(
    transcript: RawTranscript,
    epsilon: number
  ): AnonymizedTranscript;
  
  redactIdentifiers(
    text: string,
    context: PrivacyContext
  ): RedactedText;
}
```

#### Data Flow Security
1. **Audio**: Encrypted in transit, deleted after transcription
2. **Transcripts**: Immediately processed for privacy
3. **Reports**: Aggregated data only, no individual quotes

### 6. Data Layer (Supabase Postgres)
**Responsibility**: Persistent data storage with security

#### Core Tables
- `sessions` - Session metadata and configuration
- `invitations` - Invitation tracking and status
- `transcripts` - Anonymized interview content
- `reports` - Generated feedback reports
- `users` - User profiles and preferences

#### Row Level Security (RLS)
- Users can only access their own sessions
- Invitees can only see their specific invitation
- Admins have controlled access for support

## Data Flow Patterns

### 1. Session Creation Flow
```
User Input → Validation → Database → AI Question Gen → Email Invitations
```

### 2. Interview Flow
```
Invitation Link → Auth Check → LiveKit Room → Real-time Audio → 
Transcription → Privacy Processing → Database Storage
```

### 3. Report Generation Flow
```
Deadline Trigger → Transcript Aggregation → AI Analysis → 
Report Generation → PDF Creation → Email Notification
```

## Security Architecture

### Authentication & Authorization
- **Supabase Auth**: JWT-based authentication
- **RLS Policies**: Database-level access control
- **API Middleware**: Route protection and rate limiting

### Data Protection
- **Encryption at Rest**: AES-256 (Supabase default)
- **Encryption in Transit**: TLS 1.3
- **Audio Security**: No persistent storage, memory-only processing

### Privacy Compliance
- **GDPR Ready**: Data export and deletion capabilities
- **Retention Policies**: Automatic cleanup after 365 days
- **Audit Logging**: Complete data access trail

## Scalability Patterns

### Horizontal Scaling
- **Stateless Services**: All components designed for horizontal scaling
- **Database Sharding**: Future consideration for >100k users
- **CDN Distribution**: Global content delivery via Vercel

### Performance Optimization
- **Edge Functions**: Reduced latency for global users
- **Connection Pooling**: Efficient database connections
- **Caching Strategy**: Session data and generated content

### Monitoring & Observability
- **Health Checks**: Automated service monitoring
- **Performance Metrics**: Response time and error rate tracking
- **Business Metrics**: Completion rates and user engagement

## Deployment Architecture

### Environment Separation
- **Development**: Local + Supabase staging
- **Staging**: Vercel preview + Supabase staging
- **Production**: Vercel + Supabase production

### CI/CD Pipeline
```
Git Push → GitHub Actions → Tests → Build → Deploy → Health Check
```

### Rollback Strategy
- **Database Migrations**: Reversible schema changes
- **Code Deployment**: Instant rollback via Vercel
- **Feature Flags**: Gradual rollout and instant disable