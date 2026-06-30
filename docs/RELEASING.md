# Releasing

How DXOS publishes packages and deploys apps. **All release mechanics run in GitHub Actions** — nobody
runs `changeset` / `pnpm publish` / `git tag` on a laptop. This runbook documents which button to press.

Design: [`docs/design/release-spec.md`](design/release-spec.md). Authoring changesets: [`agents/instructions/changesets.md`](../agents/instructions/changesets.md).

## The two publish groups

- **Group A — Core/SDK** (`@dxos/echo`, `@dxos/client`, `@dxos/react-ui`, …): one lockstep version line.
- **Group B — Plugins + CLI** (`@dxos/plugin-*`, `@dxos/cli`): a second lockstep line.

Naming one member in a changeset bumps the whole group. **Apps are not in a publish group** — they deploy, never publish.

The groups carry independent version numbers but **release together**: the single "Version Packages" PR drains all pending changesets, so queued core + plugin bumps publish in the same merge. Independent release *timing* is deferred to a future repo split (plugins → their own repo + trunk + Version PR), not per-group branches.

> **Pre-1.0 rule: every changeset is `patch`.** While the groups are `0.x`, a `minor` escalates the whole
> group straight to `1.0.0` (a Changesets fixed-group behavior). Reserve `minor`/`major` for the deliberate
> `1.0.0` cut.

## Stable release → npm `@latest`

1. Feature PRs include a `.changeset/*.md` (see the authoring guide). It is not required — CI's `changeset-reminder` job posts an advisory comment if a publishable change has none; chores just omit it.
2. On every push to `main`, **`release.yml`** maintains a **"Version Packages" PR** (bumps versions, writes
   changelogs, stamps `version.ts` + `tauri.conf.json` via `sync-versions.mjs`).
3. **Human gate: merge the "Version Packages" PR.** The merge triggers `release.yml` to publish the bumped
   packages to npm `@latest` (OIDC + provenance) and push tags.

That's the whole loop: add changesets → merge the Version PR. (An on-demand `workflow_dispatch` on
`release.yml` also exists.)

## Pre-release → npm `@next`

`@next` ships as **snapshot releases** — no Changesets `pre` mode, no `.changeset/pre.json`, no long-lived branch.

1. **Human gate: run the workflow.** Actions → **Release (next)** → Run workflow (optionally pass a `ref`).
2. **`release-next.yml`** runs `changeset version --snapshot next` (ephemeral versions like
   `0.9.1-next-<datetime>` for packages with pending changesets — a fixed group snapshots together) and
   `changeset publish --tag next --no-git-tag`. Nothing is committed; no git tags. No-op when no changesets are pending.

Snapshots are throwaway and never touch `@latest`. This repo does not use `pre` mode at all — `release.yml`
fails fast if a stray `pre.json` ever appears.

## Continuous package previews → pkg.pr.new

Every push to `main` runs **`pkg-pr-new.yml`**, which builds and publishes all *public* (non-`private`)
packages to [pkg.pr.new](https://pkg.pr.new). This is an ephemeral per-commit install channel for testing
unreleased changes — independent of the `@latest`/`@next` npm channels and not gated on changesets.

## Deploy apps (no npm publish)

App deploys are **decoupled from publishing** — deploying never releases a package. Deployable apps and
the environments each targets are declared in [`.github/workflows/deploy-manifest.json`](../.github/workflows/deploy-manifest.json)
(generic — add an app by adding an entry). All deploys run through **`deploy-apps.yml`**.

Four environments. "What's on each env" is tracked by the floating **`env/<name>` git tags** (`env/labs`,
`env/staging`, `env/production`) that each deploy force-updates — the replacement for the old per-environment
branches (`main` itself tracks the `main` env). No GitHub Environments are used.

| Env | Trigger | How |
| --- | --- | --- |
| **main** | automatic | every push to `main` deploys the `main`-enabled apps |
| **labs** | manual | Actions → **Deploy Apps** → Run workflow → environment **labs**, pick `app` + `ref` |
| **staging** | manual | Run workflow → environment **staging** (build sees `DX_ENVIRONMENT=staging` for pre-release config) |
| **production** | **automatic on release** | the release pipeline deploys production **only when a publish actually happened** (see below) |

**Production is gated by the release** (no GitHub-Environment approval needed): it is *not* selectable in the
manual Run-workflow, and the only path that targets it is `release.yml` calling the deploy with
`environment=production` — which only happens when a human merges the "Version Packages" PR. So an arbitrary
ref can never reach production; it always deploys the released commit. (See `env/production` for the current tip.)

> **Composer-only production deploys.** Production fires on an npm publish (`release.yml` output
> `published == true`). If you need to ship a Composer build to production *without* an npm release, that's
> the one gap — either let it ride the next release, or add a `composer-app` release-tag trigger. Open item
> in the parked-steps doc.

## Desktop & mobile (Tauri / CrabNebula)

Native builds run in **`publish-tauri.yaml`** (CrabNebula `cn`), a **reusable workflow** fully decoupled
from npm. **Tauri publishes whenever Composer deploys to a named environment** — `deploy-apps.yml` invokes
it (via `workflow_call`) in the *same run* as the Composer web deploy, for `labs`/`staging`/`production`
(also runnable manually via `workflow_dispatch`, with an environment dropdown). The CrabNebula channel is
derived from the **`environment` input** (`labs` = default channel). The version comes from
`composer-app`'s `package.json` (stamped into `tauri.conf.json`), with a per-channel prerelease suffix for
build uniqueness — separate from the core/plugin and `@next` npm version lines.

- **the `main` environment is intentionally excluded** — it is the rolling web preview (every `main` push);
  building/signing a desktop + iOS app per commit is prohibitively expensive. Desktop/mobile rides the named
  environments.
- **iOS → App Store Connect** uploads on the **`labs` environment only** (TestFlight) for now, until the
  staging→App Store path is stabilized. Desktop (macOS) builds on every Tauri run.

To cut a new desktop/extension version off the npm side, add a changeset naming `@dxos/composer-app` (or
`@dxos/composer-crx`) — this bumps only that app (no plugin/core publish).

## Parked (privileged / human-only)

Not automated by this change — see the parked-steps section of the handoff:

- Enable "require linear history" + merge queue on `main` (repo settings).
- Retire the long-lived `production` / `staging` / `labs` / `dev` branches (back up tips first).
- Delete release-please / per-commit-npm / PR-title workflows — only **after** a real release proves this
  pipeline (overlap, do not gap).
