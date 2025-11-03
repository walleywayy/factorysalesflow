# Factory Sales Flow

Lightweight sales-ops automation for Factory AI. Automatically processes website leads through enrichment, scoring, and personalized outreach.

## Features

- **Lead Intake**: POST API endpoint for website form submissions
- **Clay Enrichment**: Company and contact data enrichment via Clay API
- **ICP Scoring**: Automatic qualification based on engineer count and industry criteria
- **Automated Outreach**: 45-minute delayed personalized emails with A/B testing
- **Admin Dashboard**: Runtime configuration of API keys, SMTP, and scoring rules
- **Slack Integration**: Optional notifications (feature-flagged)

## Architecture

```
Website Form → /api/leads/intake → BullMQ Jobs:
  1. enrich_lead (Clay API)
  2. score_company (ICP rules)
  3. send_outreach (45min delay, SMTP/mailto)
```

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repo>
   cd factorysalesflow
   pnpm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis URLs
   ```

3. **Database Setup**
   ```bash
   pnpm db:migrate
   ```

4. **Start Services**
   ```bash
   pnpm dev  # Starts web server + job workers
   ```

5. **Configure via Admin Panel**
   - Visit `/admin/env`
   - Default password: `admin123` (set via `ADMIN_PASSWORD`)
   - Add Clay API key, SMTP credentials, scoring thresholds

## API Reference

### Lead Intake
```bash
POST /api/leads/intake
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe", 
  "company": "Acme Corp",
  "work_email": "john@acme.com",
  "how_did_you_find_us": "Google Search"
}
```

### Response
```json
{
  "success": true,
  "leadId": "clx123...",
  "message": "Lead submitted successfully"
}
```

## Configuration

All configuration can be managed via the `/admin/env` interface:

### Clay API
- **API Key**: Your Clay enrichment API key
- **Test**: Validates connection with factory.ai domain

### SMTP Email
- **Host/Port**: Gmail (smtp.gmail.com:587) recommended
- **Credentials**: App password or OAuth token
- **From Address**: Default `willem.alleyne@princeton.edu`
- **Test**: Sends verification email

### Scoring Rules
- **Engineer Threshold**: Default 20 engineers for auto-outreach
- **ICP Industries**: SaaS, AI/ML, DevTools (comma-separated)
- **Geos**: US, EU (comma-separated)

### Slack (Optional)
- **Enabled**: Feature flag for notifications
- **Webhook URL**: Slack incoming webhook
- **Test**: Posts test message

## Email Templates

Two built-in templates with A/B testing:

**Template A (Value-first)**
- Subject: "Ship faster with agents at {{company}}"
- Focus: Operational efficiency and velocity

**Template B (Technical)**  
- Subject: "Cut ops toil for {{role}} at {{company}}"
- Focus: Technical debt and team productivity

### Template Variables
- `{{first_name}}` - Lead first name
- `{{role}}` - Contact title
- `{{company}}` - Company name
- `{{eng_size}}` - Engineer count
- `{{recent_event}}` - Recent funding/growth
- `{{relevant_stack}}` - Tech stack summary
- `{{value_one_liner}}` - Value proposition
- `{{cta}}` - Call to action

## Data Model

- **leads**: Form submissions with extracted company domain
- **companies**: Clay-enriched company data (size, industry, funding)
- **contacts**: Engineering/product contacts from Clay
- **enrichment_runs**: API call logs and responses
- **scores**: ICP evaluation results and decisions
- **outreach_attempts**: Email send status and tracking
- **settings**: Runtime configuration (encrypted values)

## Commands

```bash
# Development
pnpm dev          # Web server + workers
pnpm worker       # Workers only
pnpm build        # Production build

# Database
pnpm db:migrate   # Run migrations
pnpm db:reset     # Reset with seed data
pnpm db:generate  # Update Prisma client

# Quality
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm type-check   # TypeScript
```

## Environment Variables

See `.env.example` for full configuration. Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis for BullMQ job queues
- `ADMIN_PASSWORD`: Admin panel authentication
- Other settings configurable via admin UI

## Deployment

1. **Database**: PostgreSQL with migrations
2. **Redis**: For job queues (Upstash recommended)
3. **Web**: Next.js deployment (Vercel/Railway)
4. **Workers**: Background process for job processing

Ensure both web and worker processes run for full functionality.

## Slack Integration

Currently feature-flagged and no-op. To enable:

1. Set `SLACK_ENABLED=true` in admin panel
2. Add webhook URL
3. Integration will post lead cards and outreach results

## Development

Built with:
- **Next.js 14** (App Router)
- **TypeScript** for type safety
- **Prisma** for database ORM
- **BullMQ** for job queues
- **Tailwind CSS** + shadcn/ui for UI
- **Zod** for validation

## License

MIT