# Deploy build-sharing (CI fan-out)

Status: **foundation landed; fan-out deferred until the basic app deploy is green** (so a fan-out failure
is attributable to the fan-out, not the not-yet-green baseline). Follow-up to the Pages→Workers migration.

## Problem

A Composer deploy builds the web bundle (`composer-app:bundle` → `out/composer`) **three times** — once in
the web `deploy` job (Linux) and once inside each native job (`build_tauri`, `build_tauri_ios`, both macOS,
via Tauri's `beforeBuildCommand`). The bundle is pure JS/web output — platform-independent — so it should be
built **once** and shared. Only the native Rust/Swift compile is genuinely per-OS.

For a given deploy environment the web-deploy bundle and the Tauri-embedded bundle are **identical** (same
env file → same `DX_*`; Tauri sets no distinct bundle flag; PWA suppression in the desktop app is runtime,
not a build split), so a single artifact per deploy run serves all three consumers.

## Foundation (already landed)

Commit `4ec999c` — `refactor(composer-app): hoist tauri beforeBuildCommand into moon deps`:

- `tauri.conf.json`: `beforeBuildCommand → ""` (was `fetch-ollama && moon run composer-app:bundle` — a
  moon-in-moon nesting).
- `composer-app/moon.yml`: `tauri-build` deps `[bundle, fetch-ollama]`; `tauri-ios-build` deps `[bundle]`;
  new `fetch-ollama` task (`cache: false`).

Result: `moon run composer-app:tauri-build` builds the frontend + sidecar via deps, then runs `tauri build`
bare against `frontendDist`. This is the local path and preserves moon's automatic dependency building. It
also makes the *bare* `tauri build` the CI contract (below).

## Fan-out design (to implement once deploy is green)

```
build-bundle (Linux)  ── moon run composer-app:bundle → upload out/composer as `composer-bundle` ──┐
                                                                                                   ▼
   web deploy (Linux)              build_tauri (macOS)              build_tauri_ios (macOS)   ← parallel
   download artifact →             download artifact →              download artifact →
   wrangler deploy (skip build)    fetch-ollama; tauri build bare   fetch-ollama? ; tauri build bare
```

Bundle built **once** (prep job); three consumers fan out in parallel. Concurrency preserved.

### Pieces

1. **`deploy-apps.yml` — `build-bundle` prep job.** Linux container. Runs `populate-env.sh "$DEPLOY_ENV"` +
   the `DX_POSTHOG_*` mapping (so the artifact matches the target env), `moon run composer-app:bundle`, then
   `actions/upload-artifact` of `packages/apps/composer-app/out/composer` as `composer-bundle`.
   - **Conditional:** only needed for `labs`/`staging`/`production` (where the native jobs co-run). On
     `main` and for static-only apps (docs, …) there's no native counterpart, so no prep job / no sharing —
     the `deploy` job builds directly. Guard the job `if:` accordingly and handle the skipped-`needs` case.
2. **`deploy-env.sh` — skip-build mode.** New env var (e.g. `PREBUILT_APPS="composer"`): for a listed app,
   skip `moon run "$task"` (the `out/<app>` dir is already populated from the artifact). Other apps in the
   same run still build normally.
3. **`deploy` job.** `needs: build-bundle`; download `composer-bundle` into `out/composer` when present, set
   `PREBUILT_APPS=composer`, then `deploy-env.sh` as today (wrangler deploy consumes the prebuilt dir,
   including `_worker.js`).
4. **`publish-tauri.yaml` — consume the artifact, run `tauri build` bare (no moon).**
   - Download `composer-bundle` into `out/composer` **if present**; run `node scripts/fetch-ollama.mjs`
     (desktop only) then `pnpm exec tauri build` / `tauri ios build` directly.
   - **Dual-mode fallback:** publish-tauri is *both* a reusable workflow (from `deploy-apps.yml`, artifact
     present) *and* a standalone `workflow_dispatch` (no artifact). When no artifact is present, fall back
     to `moon run composer-app:tauri-build` (the foundation makes that build the frontend via deps). So:
     `if artifact → bare tauri build; else → moon run tauri-build`.
5. **Remote cache policy.** The `build-bundle` prep job may use the Depot remote cache on `main` only; full
   clean build on `labs`/`staging`/`production` (a stale/corrupt cache entry must never reach a user-facing
   deploy — reliability, not security). Web `deploy` + native jobs consume the artifact, so they don't build.

### Why deferred

- Not locally validatable — only a real CI run (Linux web + **signed** macOS desktop + iOS) proves it, and
  `publish-tauri.yaml` is signing-sensitive.
- Conditional job graph + dual-mode fallback are easy to get subtly wrong; validating against a **green**
  baseline deploy makes any failure attributable to the fan-out.

### Prerequisite

Basic app deploy green: `CLOUDFLARE_API_TOKEN` has **Workers Scripts: Edit**, and each `composer-<env>`
Worker has its D1 DB + R2 bucket + `SIGNOZ_INGESTION_KEY` secret (see `release-parked-steps.md §6`).
