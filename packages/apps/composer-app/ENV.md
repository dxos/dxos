# Environments

Composer deploys to Cloudflare Workers (Static Assets). One Worker per environment, selected at deploy
time with `wrangler deploy --env <env>` — see [`wrangler.jsonc`](./wrangler.jsonc) for the per-env Worker
name and bindings, and [`.github/workflows/env/*`](../../../.github/workflows/env) for the build-time
variables (`DX_EDGE_BASE_URL`, `DX_HUB_URL`, PostHog keys, …).

| Environment  | Worker             | URL                         | EDGE         | Deployed                            |
| ------------ | ------------------ | --------------------------- | ------------ | ----------------------------------- |
| `dev`        | `composer-dev`     | `composer-dev.…workers.dev` | EDGE nightly | on demand                           |
| `nightly`    | `composer-nightly` | `nightly.composer.space`    | EDGE prod    | daily, 07:00 UTC, from `main`'s tip |
| `staging`    | `composer-staging` | `staging.composer.space`    | EDGE prod    | on demand (kept, unused)            |
| `production` | `composer`         | `composer.space`            | EDGE prod    | on demand; cuts a release           |

`dev` is also the Worker PR previews upload versions to (`wrangler versions upload --preview-alias pr-N`),
so a preview and a `dev` deploy see the same EDGE data.

Local dev (`moon run composer-app:serve`) reads [`dx-local.yml`](./dx-local.yml) and defaults to EDGE
nightly; override with `DX_EDGE_BASE_URL` to reach EDGE dev or a local EDGE.

## Notes

- Bindings are **not** inherited by `env.*` sections — each environment repeats them in full.
- Cloudflare-side, each environment's Worker needs its R2 bucket and the `SIGNOZ_INGESTION_KEY` secret
  (`pnpm secrets remote <env> composer`).
- Secrets are managed via [`scripts/secrets.mjs`](../../../scripts/secrets.mjs) (`pnpm secrets`), sourced
  from 1Password.
