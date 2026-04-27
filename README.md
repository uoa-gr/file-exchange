# File Exchange

End-to-end encrypted file transfer between named users. Web app. Server (Supabase) only ever sees ciphertext. Two transports — temporary Supabase Storage (gated by quota) or direct WebRTC peer-to-peer (no size limit, both online required) — auto-selected per send.

Spec: [docs/superpowers/specs/2026-04-27-file-exchange-design.md](docs/superpowers/specs/2026-04-27-file-exchange-design.md)
Pre-pivot history (Electron desktop predecessor): [docs/archive/](docs/archive/)
Stable code at `desktop-archive` git tag if you want to read it.

## Quickstart

```bash
nvm use                # Node 20
corepack enable        # pnpm via corepack
pnpm install
pnpm dev               # http://localhost:5173
```

## Layout

```
apps/
  file-exchange/         Vite + React + TypeScript SPA
packages/
  crypto/                libsodium primitives (sign, seal, secretstream, KDF)
  keystore/              browser keystore for the Argon2id-encrypted private key
  shared/                domain types + RPC shapes
  transfer/              envelope compose/verify (pure functions)
  supabase-client/       typed Supabase wrapper (RPCs, Realtime, Storage)
supabase/
  migrations/            *.sql applied via the Supabase MCP / `supabase db push`
  functions/             Edge Functions (storage-deletion-worker, orphan reaper)
docs/
  superpowers/specs/     active design specs
  superpowers/plans/     active implementation plans
  archive/               pre-pivot historical specs + plans
```

## Deploy

**Vercel** (production): connect the repo, accept the auto-detected settings — `vercel.json` already declares the build command, output dir, SPA rewrite, and security headers.

**GitHub Pages** (staging / preview): the `.github/workflows/pages.yml` workflow builds and deploys on every push to `main`. The default base path is `/file-exchange/`; override via the repo `PAGES_BASE_URL` Variable when using a custom domain.

The Supabase URL and publishable key are baked into the bundle at build time (gated by RLS — safe to commit). No runtime env vars required for the SPA.

## Tests

```bash
pnpm typecheck         # all packages
pnpm test              # node-runner suites
```

The RLS test suite under `packages/supabase-client/test/` requires a `.env.test` with a Supabase **secret key** (`sb_secret_*`) — see `.env.test.example`.

## License

TBD.
