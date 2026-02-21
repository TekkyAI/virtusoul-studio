# Contributing to VirtuSoul Studio

## Development Setup

```bash
# Prerequisites: Node.js 20+, Docker

# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/virtusoul-studio.git
cd virtusoul-studio

# 2. Start PostgreSQL
docker compose up -d db

# 3. Install and configure
npm install
cp .env.example .env

# 4. Run migrations
npm run db:migrate

# 5. Start dev server
npm run dev
```

## Project Structure

```
├── server/           # Hono.js backend
│   ├── db/           # Drizzle schema + client
│   ├── lib/          # Auth, gateway client, config
│   ├── middleware/    # Auth middleware
│   └── routes/       # API routes
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── hooks/        # React hooks
│   ├── lib/          # Utilities, types, chat client
│   └── pages/        # Page components
├── drizzle/          # Migration files
└── public/           # Static assets, fonts
```

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure `npm run build` passes
4. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- Functional components with hooks
- Tailwind v4 for styling (use CSS variables from design system)
- Hono.js for backend routes
