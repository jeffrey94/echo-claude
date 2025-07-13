# Echo - Claude Development Guide

## Project Overview
Echo is an anonymous peer feedback platform with AI-conducted audio interviews. This guide helps Claude understand the project structure and development workflow.

## Technology Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Audio**: LiveKit SDK for real-time audio interviews
- **AI**: OpenAI GPT-4o for three core agents
- **Email**: Resend for transactional emails
- **Deployment**: Vercel for frontend, Supabase for backend

## Development Commands

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Testing
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e

# Run type checking
npm run type-check
```

### Building & Deployment
```bash
# Build for production
npm run build

# Start production server locally
npm start

# Lint code
npm run lint

# Format code
npm run format
```

### Database
```bash
# Generate Supabase types
npm run db:types

# Reset local database
npm run db:reset

# Apply migrations
npm run db:migrate
```

## Project Structure
```
/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # User dashboard
│   ├── session/           # Session management
│   ├── interview/         # Audio interview interface
│   └── api/               # API routes
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── audio/            # Audio-related components
│   └── forms/            # Form components
├── lib/                  # Utility functions and configurations
│   ├── supabase.ts       # Supabase client
│   ├── openai.ts         # OpenAI client
│   └── utils.ts          # General utilities
├── types/                # TypeScript type definitions
├── supabase/             # Database schema and functions
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
├── requirements/         # Project requirements
├── design/              # Technical design documents
├── DEVELOPMENT.md       # Development log and progress tracking
└── Incremental To-Do List.md  # Detailed task breakdown with priorities
```

## Environment Variables
See `.env.example` for required environment variables:
- Supabase credentials
- OpenAI API key
- LiveKit credentials
- Resend API key

## Development Workflow

### When Starting Work
1. Check the current git branch and status
2. Run `npm install` if package.json changed
3. Run `npm run dev` to start development server
4. Run `npm run type-check` to verify TypeScript
5. **Review Incremental To-Do List.md** for current phase priorities

### During Development Session
1. **Update DEVELOPMENT.md** at start of session with planned work
2. Reference task IDs from Incremental To-Do List.md (e.g., [1.1], [2.5])
3. Document decisions and blockers in real-time
4. Track time estimates vs actual time spent

### Before Committing
1. Run `npm run lint` to check code style
2. Run `npm run type-check` to verify TypeScript
3. Run `npm run test` to ensure tests pass
4. Run `npm run build` to verify production build
5. **Update DEVELOPMENT.md** with completed work and next steps

### End of Session
1. **Log progress in DEVELOPMENT.md** with completed tasks, issues, decisions
2. Update task status in Incremental To-Do List.md if needed
3. Note any blockers or risks for next session

### Code Conventions
- Use TypeScript for all new files
- Follow existing naming conventions
- Use Tailwind CSS for styling
- Prefer functional components with hooks
- Use shadcn/ui components when possible

## Development Planning

### Task Management
- **Incremental To-Do List.md**: 96 tasks across 10 phases with dependencies
- **DEVELOPMENT.md**: Daily progress log with decisions and blockers
- **Task References**: Use IDs like [1.1], [2.5] to reference specific tasks

### Current Phase Priority
Check Incremental To-Do List.md for current phase. Always start with:
1. **Critical tasks** 🔴 (blocks other work)
2. **High priority** 🟡 (enables other features)  
3. **Medium/Low** 🟢🔵 (can be done concurrently)

### 10 Development Phases (12 weeks)
1. **Phase 1**: Foundation & Infrastructure (Week 1)
2. **Phase 2**: Authentication & Session Management (Week 2-3)
3. **Phase 3**: AI Question Generation (Week 3-4)
4. **Phase 4**: Invitation System (Week 4-5)
5. **Phase 5**: Audio Infrastructure (Week 5-7)
6. **Phase 6**: DeepDive AI Agent (Week 6-7)
7. **Phase 7**: Privacy & Anonymization (Week 7-8)
8. **Phase 8**: Report Generation (Week 8-9)
9. **Phase 9**: Follow-up & NPS (Week 9-10)
10. **Phase 10**: Testing & Polish (Week 10-12)

## Testing Strategy
- **Unit Tests**: Components and utility functions
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Complete user workflows
- **Manual Testing**: Audio functionality and AI agents

## Deployment Process
1. Push to main branch triggers Vercel deployment
2. Supabase migrations applied automatically
3. Environment variables configured in Vercel dashboard
4. Monitor deployment health checks

## Troubleshooting

### Common Issues
- **Audio not working**: Check LiveKit credentials and browser permissions
- **Database errors**: Verify Supabase connection and RLS policies
- **Build failures**: Run type-check and fix TypeScript errors
- **AI agent failures**: Check OpenAI API key and rate limits

### Debug Commands
```bash
# Check environment variables
npm run check-env

# Verify database connection
npm run db:status

# Test AI agent connections
npm run test:agents
```

## Performance Targets
- Page load: <2s (95th percentile on 4G)
- Audio latency: <400ms end-to-end
- Concurrent interviews: 5,000 simultaneous
- API response: 1,000 RPS capability

## Security Considerations
- All PII encrypted at rest (AES-256)
- Audio deleted immediately after transcription
- Differential privacy for transcript anonymization
- JWT-based authentication with short expiry
- Row Level Security (RLS) for all database access