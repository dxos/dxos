# Releasing

How DXOS publishes packages and deploys apps. **All release mechanics run in GitHub Actions** — nobody
runs `changeset` / `pnpm publish` / `git tag` on a laptop. This runbook documents which button to press.

Design: [`docs/design/release-spec.md`](design/release-spec.md). Authoring changesets: [`agents/instructions/changesets.md`](../agents/instructions/changesets.md).

## The two publish groups

- **Group A — Core/SDK** (`@dxos/echo`, `@dxos/client`, `@dxos/react-ui`, …): one lockstep version line.
- **Group B — Plugins + CLI** (`@dxos/plugin-*`, `@dxos/cli`): a second lockstep line.

Naming one member in a changeset bumps the whole group. **Apps are not in a publish group** — they deploy, never publish.

The groups carry independent version numbers but **release together**: the single "Version Packages" PR drains all pending changesets, so queued core + plugin bumps publish in the same merge. Independent release *timing* is deferred to a future repo split (plugins → their own repo + trunk + Version PR), not per-group branches.

> **Versioning is standard semver at every version.** At `0.x`, breaking changes ride the **minor**
> (`0.9.0 → 0.10.0`) and `major` is reserved for the deliberate `1.0.0` cut. A `minor` does **not** cascade
> the group to `1.0.0` — the old Changesets fixed-group misbehavior is fixed by the release setup (the
> `workspace:^` peers + flag + `assemble-release-plan` patch; see
> [`release-spec.md`](design/release-spec.md)). Pick the bump level per the
> [authoring guide](../agents/instructions/changesets.md).

## Stable release → npm `@latest`

1. Feature PRs include a `.changeset/*.md` (see the authoring guide). It is not required — CI's `changeset-reminder` job posts an advisory comment if a publishable change has none; chores just omit it.
2. On every push to `main`, **`publish-all.yml`** maintains a **"Version Packages" PR** (bumps versions,
   writes changelogs, stamps `version.ts` + `tauri.conf.json` via `sync-versions.mjs`).
3. **Human gate: merge the "Version Packages" PR.** The merge triggers `publish-all.yml` to publish the
   bumped packages to npm `@latest` (OIDC + provenance) and push tags.

That's the whole loop: add changesets → merge the Version PR. (An on-demand `workflow_dispatch` on
`publish-all.yml` also exists.)

> **Why `publish-all.yml`?** npm's OIDC trusted publisher is bound to that workflow filename, so the actual
> `changeset publish` must run from it — publishing from any other file is rejected by npm's OIDC.

## Pre-release → npm `@next`

`@next` ships as **snapshot releases** — no Changesets `pre` mode, no `.changeset/pre.json`, no long-lived branch.

1. **Human gate: run the workflow.** Actions → **Release (next)** → Run workflow (optionally pass a `ref`).
2. **`release-next.yml`** runs `changeset version --snapshot next` (ephemeral versions like
   `0.9.1-next-<datetime>` for packages with pending changesets — a fixed group snapshots together) and
   `changeset publish --tag next --no-git-tag`. Nothing is committed; no git tags. No-op when no changesets are pending.

Snapshots are throwaway and never touch `@latest`. This repo does not use `pre` mode at all —
`publish-all.yml` fails fast if a stray `pre.json` ever appears.

## Continuous package previews → pkg.pr.new

Every push to `main` runs **`pkg-pr-new.yml`**, which builds and publishes all *public* (non-`private`)
packages to [pkg.pr.new](https://pkg.pr.new). This is an ephemeral per-commit install channel for testing
unreleased changes — independent of the `@latest`/`@next` npm channels and not gated on changesets.

## Deploy apps (no npm publish)

App deploys are **fully decoupled from publishing** — apps build from workspace source, are **not in
Changesets**, and never publish to npm. Deployable apps + their environments are declared in
[`deploy-manifest.json`](../.github/workflows/deploy-manifest.json); all deploys run through
**`deploy-apps.yml`**. Full model: [`docs/design/app-release-spec.md`](design/app-release-spec.md).

"What's deployed where" is tracked by per-app floating git tags **`<app>/<env>`** (e.g. `composer/production`,
`docs/production`), force-updated on each deploy — the branch-pointer replacement. `main` is the branch tip.
No GitHub Environments.

The one entry point is **Deploy Apps** — the app set is derived from the environment, so you only pick the
environment (no per-app choice):

| Env | Trigger | Apps | Notes |
| --- | --- | --- | --- |
| **main** | automatic on push to `main` | all `main`-enabled apps | rolling preview |
| **labs** | manual (**Deploy Apps** → `labs`) | composer | prerelease Tauri build |
| **staging** | manual (**Deploy Apps** → `staging`) | composer + docs | prerelease Tauri build |
| **production** | manual (**Deploy Apps** → `production`) | all apps | cuts a versioned Composer release (below) |

**Composer** is versioned; **docs and the example apps** (`todomvc`, `tasks`, `testbench`, `storybook`) are
not (no `version` field). A **production** deploy additionally cuts a **versioned Composer release** — its
`release` job bumps `composer-app`/`crx` by the dispatch's `bump` input (`patch`/`minor`/`major`), commits
the bump to `main`, tags `composer-v<x>`, and the rest of the run builds + deploys that commit (web +
desktop + iOS). This is the only path that advances Composer's version. No npm publish, ever.

## Desktop & mobile (Tauri / CrabNebula)

Native builds run in **`publish-tauri.yaml`** (CrabNebula `cn`), a **reusable workflow** invoked by
`deploy-apps.yml` in the same run as the Composer deploy, for `labs`/`staging`/`production` (also directly via
`workflow_dispatch`). The version comes from `composer-app`'s `package.json`:

- **production** → the clean version bumped by the `release` job on the **primary** CN channel — the primary
  desktop release channel.
- **labs / staging** → `<version>-<env>.<sha>`, a unique per-commit prerelease on that env's channel.
- **iOS → App Store Connect (TestFlight)** on the **`labs`** run only, for now. Desktop (macOS) builds on every run.
- **`main` is excluded** — a signed desktop/iOS build per commit is too costly; desktop/mobile rides the named envs.

To cut a new desktop/extension version, run **Deploy Apps → `production`** — its `release` job owns
Composer's version (Composer is *not* a Changesets package).

## Parked (privileged / human-only)

Not automated by this change — see the parked-steps section of the handoff:

- Enable "require linear history" + merge queue on `main` (repo settings).
- Retire the long-lived `production` / `staging` / `labs` / `dev` branches (back up tips first).
- This PR removed the legacy release machinery (`release-please.yml`, `release-candidate.yml`, the
  per-branch npm path of `publish-all.yml`, `scripts/{publish,deploy-apps,apps,bundle-apps}.sh`,
  `scripts/bump-version.js`, `release-please-config.json`, `.release-please-manifest.json`). If branch
  protection lists any of their jobs as **required checks**, drop those requirements (repo settings) or the
  merge queue will block. `validate-pr-title.yaml` is intentionally kept (enforces the PR-title convention).
