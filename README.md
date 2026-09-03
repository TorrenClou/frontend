# TorrenClou Frontend

The Next.js web app for [TorrenClou](https://tc.gitnasr.com) — self-hosted
torrent-to-cloud.

> **Just want to run it?** You do not need this repo.
>
> <!-- snippet:install-linux -->
> ```bash
> curl -fsSL https://raw.githubusercontent.com/TorrenClou/deploy/main/install.sh | bash
> ```
> <!-- /snippet -->
>
> Full documentation: **[tc.gitnasr.com/docs](https://tc.gitnasr.com/docs)**

## What lives in this repo

```
app/
├── (auth)/          Login and OAuth callback
├── (setup)/         First-run wizard — creates the one admin account
├── (dashboard)/     Torrents, jobs, storage profiles
├── dashboard/       Dashboard shell, files, settings
└── api/auth/        NextAuth route handler
components/  ·  hooks/  ·  lib/  ·  stores/  ·  types/
```

Two things worth knowing before you change anything here:

- **There are no `NEXT_PUBLIC_*` variables, deliberately.** The browser calls the
  relative path `/proxy/api`, and the server resolves it to the backend. The API
  address is never baked into client bundles, so one build works against any
  backend.
- **Auth is credentials-only.** `auth.config.ts` registers a single `Credentials`
  provider that posts to the backend. Google is a *storage* provider, connected
  per-user inside the app — it is not a sign-in method.

## Developing

```bash
git clone https://github.com/TorrenClou/frontend.git
cd frontend
npm ci
cp .env.example .env.local   # optional — see the file, everything has a default
npm run dev
```

The dev server listens on `http://localhost:3000` and expects the API on
`http://localhost:47200`. Start the backend first — see
[TorrenClou/backend](https://github.com/TorrenClou/backend).

Sign-in needs `NEXTAUTH_SECRET`; it is the only value without a fallback.
Every configuration key is documented at
[tc.gitnasr.com/docs](https://tc.gitnasr.com/docs/configuration).

```bash
npm run build        # production build (output: standalone)
npx tsc --noEmit     # type check, same gate CI runs
```

## Repositories

| Repository | Contents |
|------------|----------|
| [backend](https://github.com/TorrenClou/backend) | .NET 9 API and workers |
| [website](https://github.com/TorrenClou/website) | Documentation site — the canonical docs live here |
| [deploy](https://github.com/TorrenClou/deploy) | All-in-one image, installer, CI |

## License

MIT — see [LICENSE](https://github.com/TorrenClou/frontend/blob/main/LICENSE).
