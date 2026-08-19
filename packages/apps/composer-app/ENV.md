# Environments

Composer deploys to Cloudflare Workers (Static Assets). One Worker per environment, selected at deploy
time with `wrangler deploy --env <env>` — see [`wrangler.jsonc`](./wrangler.jsonc) for the per-env Worker
name and bindings, and [`.github/workflows/env/*`](../../../.github/workflows/env) for the build-time
variables (`DX_EDGE_BASE_URL`, `DX_HUB_URL`, PostHog keys, …).

| Environment  | Worker             | URL                         | EDGE         | Deployed                            |
| ------------ | ------------------ | --------------------------- | ------------ | ----------------------------------- |
| `dev`        | `composer-dev`     | `composer-dev.…workers.dev` | EDGE preview | on demand                           |
| `preview`    | `composer-preview` | `preview.composer.space`    | EDGE prod    | daily, 07:00 UTC, from `main`'s tip |
| `staging`    | `composer-staging` | `staging.composer.space`    | EDGE prod    | on demand (kept, unused)            |
| `production` | `composer`         | `composer.space`            | EDGE prod    | on demand; cuts a release           |

**Two things are called "preview".** The `preview` ENVIRONMENT above is the daily dogfood deploy on its
own Worker and domain. A per-PR preview is something else: a Worker preview _version_ of the `dev` env,
built by `pr-build.yml` and uploaded by `pr-deploy.yml` (`wrangler versions upload --preview-alias pr-N`), so a PR
preview and a `dev` deploy see the same EDGE data.

Local dev (`moon run composer-app:serve`) reads [`dx-local.yml`](./dx-local.yml) and defaults to EDGE
preview; override with `DX_EDGE_BASE_URL` to reach EDGE dev or a local EDGE.

## Notes

- Bindings are **not** inherited by `env.*` sections — each environment repeats them in full.
- Cloudflare-side, `wrangler deploy` creates the Worker itself, and every R2 bucket the `env.*` sections
  bind already exists — `preview` and `dev` deliberately share `composer-feedback-logs-dev`, while
  `production` and `staging` have their own. Note `staging`'s bucket is `composer-feedback-logs-preview`:
  it is bound by `env.staging` and has nothing to do with the `preview` environment. What each new Worker
  does need is its own `SIGNOZ_INGESTION_KEY` secret (`pnpm secrets remote <env> composer`), matched by a
  1Password section named after the raw Worker name.
- Secrets are managed via [`scripts/secrets.mjs`](../../../scripts/secrets.mjs) (`pnpm secrets`), sourced
  from 1Password.
