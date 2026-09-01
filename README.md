# TorrentClou Frontend

The Next.js 15 frontend for [TorrentClou](https://github.com/TorrenClou) — a self-hosted cloud torrent management platform.

> **Just want to run the whole project?** See [TorrenClou/deploy](https://github.com/TorrenClou/deploy) for one-command setup.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 | React framework with App Router and SSR |
| React | 18 | UI library |
| TypeScript | 5.6 | Type safety (strict mode) |
| Tailwind CSS | 3.4 | Utility-first styling |
| NextAuth.js | 5 (beta) | Authentication (email and password) |
| React Query | 5 (TanStack) | Server state, caching, background refetching |
| Zustand | 5 | Client-side state management |
| Zod | 4 | Runtime schema validation |
| Radix UI | - | Accessible headless UI primitives |
| Recharts | 3 | Dashboard charts and visualizations |
| Axios | 1.7 | HTTP client |
| React Hook Form | 7 | Form handling |
| Sonner | 1.7 | Toast notifications |

## Project Structure

```
app/
├── (auth)/              # Auth route group (login page)
├── (dashboard)/         # Dashboard route group
├── api/                 # API routes (NextAuth handlers)
├── dashboard/           # Main dashboard page
├── layout.tsx           # Root layout
└── page.tsx             # Landing page

components/
├── jobs/                # Job management components
├── layout/              # Sidebar, header, navigation
├── providers/           # React Query, auth, theme providers
├── shared/              # Reusable shared components
├── storage/             # Google Drive & S3 config components
└── ui/                  # Base UI primitives (Button, Dialog, etc.)

hooks/                   # Custom React hooks
lib/
├── api/                 # API client functions (health, etc.)
└── axios.ts             # Configured Axios instance
stores/                  # Zustand stores
types/                   # TypeScript types and Zod schemas
```

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) (or npm)
- Running backend API (see [TorrenClou/backend](https://github.com/TorrenClou/backend))

## Development Setup

### 1. Clone and configure

```bash
git clone https://github.com/TorrenClou/frontend.git
cd frontend
cp .env.example .env.local
# Edit .env.local with your values
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Start dev server

```bash
yarn dev
```

Opens at `http://localhost:47100`. The backend API should be running at `http://localhost:47200`.

## Environment Variables

All optional. The browser talks to the API through a same-origin `/proxy` rewrite, so the
app works on any host or IP without being told its own address.

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:47200` | Where the API is. Server-side only. |
| `NEXTAUTH_SECRET` | generated | Session encryption secret. The container generates and persists one. |
| `NEXTAUTH_URL` | derived | Canonical URL. Derived from the request host unless set. |
| `ALLOW_INSECURE_TLS` | `false` | Skip TLS verification when calling the API. Self-signed certificates only. |

> There are no `NEXT_PUBLIC_*` variables. Nothing about the backend location is baked into
> the browser bundle.

## Build

```bash
yarn build
```

The project uses `output: 'standalone'` in `next.config.js` for Docker-optimized builds. The standalone output is located at `.next/standalone/server.js`.

## Key Features

### Authentication
- Credential-based login via NextAuth.js v5
- Google OAuth integration
- JWT tokens stored in encrypted session cookies
- Server-side auth validation on protected routes via middleware

### Dashboard
- Real-time torrent download progress
- Job management (queue, retry, cancel)
- Storage usage statistics with charts

### Storage Management
- Google Drive: OAuth credential management, auto-sync configuration
- S3: Bucket configuration for AWS, Backblaze B2, MinIO, etc.

### UI/UX
- Responsive design (desktop + mobile)
- Dark/light theme toggle via `next-themes`
- Toast notifications for async operations
- Accessible components via Radix UI primitives

## CI/CD

Merging to `main` triggers a dispatch to the [deploy repo](https://github.com/TorrenClou/deploy), which builds the combined all-in-one Docker image containing both frontend and backend.

See `.github/workflows/dispatch-combined-build.yml`.

## Related Repositories

| Repository | Description |
|-----------|-------------|
| [TorrenClou/backend](https://github.com/TorrenClou/backend) | .NET 9.0 API and background workers |
| [TorrenClou/deploy](https://github.com/TorrenClou/deploy) | All-in-one Docker image, CI/CD, run scripts |

## License

See [LICENSE](LICENSE).
