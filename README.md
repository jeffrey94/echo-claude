# Echo - Anonymous Peer Feedback Platform

Make high-quality, anonymous peer feedback as easy as a 15-minute audio chat, and turn it into an actionable growth plan for every knowledge worker.

## Features

- **15-minute AI-conducted audio interviews** for natural feedback conversations
- **Anonymous processing** with differential privacy protection  
- **AI-generated insights** that create actionable growth plans
- **Automated workflow** from invitation to final report

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Supabase account
- OpenAI API key
- LiveKit account
- Resend account (for emails)

### Installation

1. **Clone and setup**
   ```bash
   git clone <your-repo-url>
   cd echo
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual credentials
   ```

3. **Database setup**
   ```bash
   # Run Supabase migrations
   npm run db:migrate
   
   # Generate TypeScript types
   npm run db:types
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- **Supabase**: Database and authentication
- **OpenAI**: AI agents for question generation, interviews, and reports  
- **LiveKit**: Real-time audio infrastructure
- **Resend**: Transactional email delivery

See `.env.example` for the complete list.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run type-check` - TypeScript validation

### Project Structure

```
app/                    # Next.js App Router pages
├── dashboard/         # User dashboard
├── session/           # Session management  
├── interview/         # Audio interview interface
└── api/               # API routes

components/            # React components
├── ui/               # Base UI components
├── audio/            # Audio-related components
└── forms/            # Form components

lib/                  # Utilities and configs
types/                # TypeScript definitions
supabase/             # Database and functions
```

## Core Workflow

1. **Session Creation**: User defines focus topics and invites 3-10 colleagues
2. **AI Question Generation**: ScopeScout adds questions to reach exactly 5 total
3. **Automated Invitations**: Email invitations with unique audio interview links
4. **Audio Interviews**: 15-minute AI-conducted conversations with DeepDive agent
5. **Privacy Processing**: Differential privacy anonymization of transcripts
6. **Report Generation**: ClarityCore creates insights with SMART actions
7. **Delivery**: Dashboard access with PDF export and automatic follow-up scheduling

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Edge Functions)
- **Audio**: LiveKit SDK with real-time transcription
- **AI**: OpenAI GPT-4o for conversation and analysis
- **Email**: Resend for transactional emails
- **Deployment**: Vercel

## Contributing

1. Check the requirements in `/requirements/` folder
2. Review technical design in `/design/` folder  
3. Follow development guide in `CLAUDE.md`
4. Run tests before submitting PRs

## License

[Your License Here]