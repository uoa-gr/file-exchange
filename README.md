# FILE EXCHANGE

Local-first collaborative file-sync desktop app. See [docs/superpowers/specs/](docs/superpowers/specs/) for the design.

## Dev quickstart

```bash
nvm use            # Node 20
corepack enable    # pnpm via corepack
pnpm install
pnpm dev           # launches Electron with Vite HMR
```

## Build

```bash
pnpm package       # local build, no publish
pnpm release       # publishes to GitHub Releases (CI only)
```
