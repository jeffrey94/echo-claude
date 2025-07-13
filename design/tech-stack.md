# Technology Stack

## Frontend
### Framework
- **Next.js 14** with App Router
  - Progressive Web App (PWA) capabilities
  - Server-side rendering for SEO
  - Built-in optimization and performance

### UI & Styling
- **Tailwind CSS** for utility-first styling
- **Shadcn/ui** for accessible component library
- **Lucide React** for consistent iconography

### Audio & Real-time
- **LiveKit React SDK** for audio interviews
  - WebRTC-based audio streaming
  - Built-in waveform visualization
  - Cross-browser compatibility (Chrome, Edge, Safari)

## Backend & Database
### Backend-as-a-Service
- **Supabase**
  - PostgreSQL database with real-time subscriptions
  - Built-in authentication and authorization
  - Row Level Security (RLS) for data protection
  - Edge Functions for serverless logic

### Database Schema
- **PostgreSQL** (via Supabase)
  - ACID compliance for data integrity
  - JSON columns for flexible session metadata
  - Full-text search capabilities

## AI & Machine Learning
### AI Agents
- **OpenAI GPT-4o** for three core agents:
  - **ScopeScout**: Question generation and session scoping
  - **DeepDive**: Real-time interview conductor
  - **ClarityCore**: Report synthesis and action planning

### Speech Processing
- **OpenAI Whisper API** for real-time transcription
  - High accuracy across languages and accents
  - Built-in noise reduction
  - <3 second latency requirement

### Privacy Processing
- **Custom Differential Privacy Service**
  - Name redaction and entity masking
  - Writing style normalization
  - Epsilon=1 privacy budget calibration

## Communication & Notifications
### Email Service
- **Resend** for transactional emails
  - High deliverability rates
  - Template management
  - Analytics and tracking

### Real-time Communication
- **LiveKit Cloud** for audio infrastructure
  - Global edge network
  - Auto-scaling capabilities
  - <400ms latency guarantee

## Development & Deployment
### Development
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality
- **Husky** for Git hooks

### Testing
- **Jest** for unit testing
- **Playwright** for end-to-end testing
- **React Testing Library** for component testing

### Deployment
- **Vercel** for frontend hosting
  - Global CDN
  - Automatic deployments
  - Edge Functions support

### Monitoring
- **Sentry** for error tracking
- **Vercel Analytics** for performance monitoring
- **Supabase Analytics** for database insights

## Security & Privacy
### Encryption
- **AES-256** encryption at rest (Supabase default)
- **TLS 1.3** for data in transit
- **JWTs** for secure authentication

### Privacy Tools
- **Differential Privacy Library** (custom implementation)
- **Data retention policies** (365-day automatic cleanup)
- **GDPR compliance** tools

## Third-party Integrations
### Calendar & Email
- **Google Workspace** API integration
- **Microsoft 365** API integration
- **iCloud** calendar support (limited)

### PDF Generation
- **React-PDF** for report generation
- **Puppeteer** for complex layouts (if needed)

## Infrastructure Requirements
### Performance Targets
- **Page Load**: <2s (95th percentile on 4G)
- **Concurrent Users**: 5,000 simultaneous interviews
- **API Response**: 1,000 RPS capability
- **Audio Latency**: <400ms end-to-end

### Scalability
- **Horizontal scaling** via Vercel Edge Functions
- **Database scaling** via Supabase connection pooling
- **Audio scaling** via LiveKit's global infrastructure

## Development Environment
### Package Management
- **pnpm** for faster, more efficient installs
- **Node.js 18+** for latest features and performance

### Version Control
- **Git** with conventional commits
- **GitHub** for repository hosting
- **GitHub Actions** for CI/CD pipelines

## Cost Optimization
### Free Tier Usage
- **Vercel**: Hobby plan for development
- **Supabase**: Free tier for initial development
- **LiveKit**: Development tier with usage limits

### Production Scaling
- **Pay-as-you-scale** model across all services
- **Usage-based pricing** aligned with business metrics
- **Cost monitoring** via service dashboards