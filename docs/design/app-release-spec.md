# App Release Model — Composer, docs, example apps

> **Status: proposed (for alignment).** Not yet implemented. This spec decouples *app deploys* from *npm
> package releases*. The package release model (Changesets, two fixed groups, `@next` snapshots, the `0.x`
> peer-cascade patch) is unchanged — see [`release-spec.md`](./release-spec.md).

## Motivation

Apps ship far more often than the SDK publishes to npm, and they build from **workspace source** — an app
never needs the packages published to deploy. The problem this spec removes: coupling a production app
deploy to an npm publish, and bumping `composer-app`'s version inside the shared "Version Packages" PR (via
dependency ripple). That couples app cadence to package cadence, which:

- **slows app releases** (you must cut a package release to ship the app), and
- would **skip npm versions** if we bumped the app through the shared Version PR frequently while
  publishing packages rarely.

Goal: **apps deploy on their own cadence, versioned independently where it matters, with no npm publish —
and with a single changeset authoring flow.**

## Principles

1. **Changesets versions packages only** (core + plugins + cli). Apps are **not** in Changesets.
2. **One authoring flow.** You only ever write package/plugin changesets. There is no "app changeset" and
   therefore no per-change decision about which kind to write. A plugin change *is* a Composer change; it's
   already captured by the plugin's changeset.
3. **Apps are versioned/deployed by dedicated workflows**, not by Changesets.
4. **Deploy never publishes to npm.** Apps bundle packages from source, so unreleased packages are fine.
5. **Unversioned apps carry no `version` field.** `docs` and the example apps have `version` removed from
   their `package.json` — they're never versioned, published, or auto-updated, so a version is misleading.

## Apps in scope

| App | Package(s) | Versioned? | Deploy surface |
| --- | --- | --- | --- |
| **Composer** | `@dxos/composer-app`, `@dxos/composer-crx` | **Yes** (own line; app + crx lockstep) | web + desktop + iOS (full Tauri) |
| **Docs** | `docs` | No | web |
| **Example apps** | `todomvc`, `tasks`, `testbench-app`, `storybook` (`storybook-react`) | No | web |

Composer needs a real version (native app auto-update checks semver + human tracking). Docs and example
apps don't — a "what's deployed" pointer is enough.

## Changesets change

Add the app packages to `.changeset/config.json` **`ignore`** (via the `toolbox.ts` generator):
`@dxos/composer-app`, `@dxos/composer-crx`, `docs`, `todomvc`, `tasks`, `testbench-app`, and the
`storybook-*` packages. Effect:

- Changesets never versions them and never ripple-bumps them, so package releases don't touch app
  versions (no version skipping).
- No changeset may name them (enforced by Changesets), which guarantees the single authoring flow.

> **Decided:** the `storybook-*` packages currently sit in **Group A** (versioned-private); they move to
> **deploy-only** — remove them from Group A membership in the generator so they're neither versioned nor
> published (and drop their `version` field per principle 5).

Everything else in the package model (fixed Groups A/B, `workspace:^` peers, OOB flag, the
`assemble-release-plan` patch, `@next` snapshots) is **unchanged**.

## Environments & triggers

| App | `main` | `labs` / `staging` | `production` |
| --- | --- | --- | --- |
| **Composer** | auto on push to `main` (rolling; current version, no bump) | `workflow_dispatch` — prerelease build | `workflow_dispatch` — **version bump** + full release |
| **Docs** | auto on push to `main` | — | `workflow_dispatch` — deploy, **no bump** |
| **Example apps** | auto on push to `main` | — | `workflow_dispatch` — deploy, **no bump** |

`production` is never auto and never on a routine push — it's always a deliberate `workflow_dispatch`. That
dispatch **is** the human gate (no GitHub Environments / approval rules needed). `main` is auto so trunk is
always live on the `main` environment.

## Composer release flow

**`main`** — on push, deploy `composer-app` to the `main` environment at its current version. No bump, no
tag beyond the branch tip (the `main` branch *is* the pointer for the `main` env).

**`labs` / `staging`** (`workflow_dispatch`, pick env) — build + deploy the **full Tauri suite (web + macOS
desktop + iOS)** at a **prerelease version = `<current>-<shortsha>`** (e.g. `1.4.2-a1b2c3d`). Throwaway —
**not** committed to `main`. Move the app's pointer tag (`composer/labs` or `composer/staging`).

**`production`** (`workflow_dispatch`, input `bump: patch | minor | major`, default **`patch`**):
1. Run full CI (build + test), or require green `Check` on the commit.
2. Bump `composer-app` + `composer-crx` (lockstep) by `bump` — a plain `package.json` version edit, no
   Changesets involved.
3. Build + deploy **web + desktop + iOS** to production.
4. **Commit the bump to `main` and push it directly** (bot commit — **no `[skip ci]`**). `main` is the
   source of truth for the version; the resulting `main` push just redeploys the `main` env at the new
   version (harmless, and no loop — a `main` deploy commits nothing).
5. Push tags: **`composer-v<X.Y.Z>`** (immutable, per release) and **`composer/production`** (moving
   pointer to the deployed SHA).
6. **No npm publish. No changelog** (deferred — see below).

**Tauri channels.** The desktop (macOS) **primary release channel is `production`** — recently moved from
`labs` on `main`; **keep it**. `labs`/`staging` are prerelease/testing channels. **iOS TestFlight**
publishing stays on **`labs` only** for now. (This branch is ~164 commits behind `main`, which already
carries the desktop-channel move — preserve it when updating from `main`.)

## Docs & example-app release flow

**`main`** — auto-deploy on push (current position). **`production`** — `workflow_dispatch`, **no version
bump**: build + deploy + move the pointer tag (`docs/production`, `todomvc/production`, `tasks/production`,
`testbench/production`, `storybook/production`). No commit-back (nothing changed), no changelog.

## Version bump mechanism (Composer only)

Plain semver edit of `composer-app` + `composer-crx` `package.json` (kept in lockstep), default `patch`,
overridable to `minor`/`major` via the workflow input. No Changesets, no dependency-range rewrites (their
`@dxos/*` deps are `workspace:*` and resolve from source at build time).

## Tagging scheme (replaces the single `env/<env>` tag)

Per-app pointers, since apps now deploy independently:

- **Composer:** `composer-v<X.Y.Z>` (immutable version tags from production releases) + `composer/production`
  / `composer/staging` / `composer/labs` (force-moved pointers to the deployed SHA).
- **Docs / example apps:** `<app>/production` pointer only.
- **`main` env:** tracked by the `main` branch tip (auto-deploys every push) — no per-app `main` tag needed.

`git rev-parse composer/production` etc. shows what's live; `git diff composer/staging..composer/production`
compares. This supersedes the current single `env/<environment>` tag.

## Changelog / release notes

**Deferred.** Composer, docs, and example apps generate **no changelog for now** (empty). Revisit later —
the natural source for Composer's notes is the plugin changesets/changelog delta since the last
`composer-v*` tag ("Composer's changes are the plugin changes"), but that's out of scope for the first cut.

## What this replaces in the current implementation

- **`release.yml`:** remove the `deploy-production` job (production is no longer gated on / triggered by an
  npm publish). Package publishing keeps its own flow; it no longer deploys anything.
- **`deploy-apps.yml` is the single entry point** (there are no separate release workflows). The deployable
  apps are listed in `scripts/apps.mjs`; each app's target environments (and Worker name / output dir) come
  from its `wrangler.jsonc`, so the app set per env is: main → all (auto on push), labs → composer,
  staging → composer + docs, production → all. Per-app pointer tags `<app>/<env>` (non-main) replace the
  single `env/<env>` tag.
- **Production cuts the versioned Composer release inside `deploy-apps.yml`** — a production-only `release`
  job bumps `composer-app`/`crx` (by the dispatch `bump` input), commits to `main`, tags `composer-v<x>`,
  and the rest of the run builds + deploys that commit. This folds in what were once separate
  `release-composer` / `release-app` workflows; the unversioned apps just deploy (no bump).
- **`publish-tauri.yaml`:** invoked by the Composer release for `labs`/`staging`/`production`; version
  derived per this spec (prerelease `-<sha>` for labs/staging; the bumped version for production) rather
  than from CrabNebula channel state.
- **Changesets config:** `ignore` the app packages (and remove `storybook-*` from Group A — open item).

## Rollout order

0. **Update the branch from `main` first** (~164 commits behind; picks up the desktop-channel move). Expect
   conflicts on the peer `package.json`s + `pnpm-lock.yaml`.
1. **Cloudflare Pages → Workers Static Assets** migration — *related rollout work, not part of this
   release model* (see the note below); done in parallel because Pages is deprecated.
2. **Changesets:** `ignore` the app packages, remove `storybook-*` from Group A; drop `version` from the
   unversioned apps.
3. **`deploy-apps.yml` as the single entry point:** env-derived app set; production-only `release` job
   (bump + commit-back + tags) folded in (no separate `release-composer` / `release-app`); per-app pointer
   tags; wire `publish-tauri` to the prerelease/production version scheme (desktop primary channel =
   production; iOS TestFlight = labs).
4. Remove `release.yml`'s `deploy-production`; reconcile `release-spec.md` / `RELEASING.md`.

## Related work — Cloudflare Pages → Workers (not part of this spec)

This release model is **deploy-target-agnostic** — it doesn't care whether apps deploy via Cloudflare
Pages or Workers. It's noted here only because it's happening **in parallel as part of the same rollout**:
since **Pages is deprecated** (April 2025; recommended target is **Workers Static Assets** — *Workers
Sites* is also deprecated), the app deploys are migrated from `wrangler pages deploy` to Workers Static
Assets. ([migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/))

**Repo-side (done):** `deploy-env.mjs` now runs `wrangler deploy` against a generated `wrangler.deploy.json`
(assets-only Worker). Pages aliased envs under one project via `--branch`; Workers uses **one Worker per
environment** — `production` → the bare Worker name (`composer`), other envs → `<worker>-<env>`
(`composer-labs`). The manifest gained `worker` (base name) and `notFoundHandling` (`single-page-application`
for SPAs, `404-page` for docs) per app. This is **independent of the release/versioning design** in this spec.

**Cloudflare-side (pending, human):** create the Workers, attach the custom domains (moving them off the
Pages projects — the switchover, with brief downtime), then retire the Pages projects. Deploy the new
Workers *before* moving the domains so there's no gap. See the runbook in `release-parked-steps.md §6`.
Not migrated here: `preview-deploy.yml` (per-PR previews still use Pages branch-alias URLs) — tracked as a
follow-up. (The legacy `deploy-apps.sh` Pages path was deleted in the release-machinery cutover.)

**Deploy build-sharing (follow-up):** the web + native jobs each rebuild Composer's bundle; a prep-job +
artifact fan-out builds it once. Foundation landed (tauri deps hoist); the CI fan-out is deferred until the
deploy is green. Design: [`deploy-build-sharing.md`](./deploy-build-sharing.md).

## Open items / prerequisites

1. **Bot push to `main`** for the Composer bump commit + tags must be allowed under `main`'s
   linear-history/branch-protection rules (confirmed OK; **no `[skip ci]`**).
2. **Preserve the desktop-channel move** (primary → `production`) and iOS-TestFlight-on-`labs` when this
   branch is updated from `main`.
