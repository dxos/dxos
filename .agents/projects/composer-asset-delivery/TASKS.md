# Composer asset delivery — Tasks

_Resume: Phase 0, measure a real update install against preview. Uncommitted: none. Last: scoped the
work, findings and decisions in DESIGN.md._

Findings (F1-F8) and decisions (D1-D7) live in [DESIGN.md](./DESIGN.md); this file is the ledger.

## Phase 0: Measure

Nothing after this phase is properly sized without numbers. Two unknowns dominate: how many precache
entries a build produces, and how much of an install is spent revalidating chunks that never
changed (F3, F5).

### Tasks

- [ ] **Count the precache manifest**
  - Build composer-app and count entries in the generated `sw.js` manifest, split by extension.
  - Compare against the `assets/` file count and the phosphor exclusion.
- [ ] **Time a real update install**
  - Deploy twice to `dev`, capture the second install in devtools: wall clock, request count, how
    many responses are 304 rather than 200.
  - This answers Q1 and tells us how much of the win is already in Phase 1.
- [ ] **Add a precache budget check**
  - Model on `scripts/check-boot-budget.mjs`, which already reads the build output and emits JSON.
  - Entry count and total precached bytes, so the Phase 4 split has a before/after and cannot
    silently regress.

## Phase 1: Stop the silent failure

The smallest change with the largest effect on diagnosis. A missing chunk currently returns
`index.html` with a 200 (F2), so every downstream failure is mislabelled. Immutable headers land
here too because F5 makes them a certain win and they may shrink Phase 4's problem.

### Tasks

- [ ] **Return a real 404 for missing assets**
  - In `_worker.ts`, after `env.ASSETS.fetch(request)`: if the path has a non-HTML extension and the
    response came back `text/html`, return 404 with `Cache-Control: no-store`.
  - Free on the hot path (D1) since every request already passes through the Worker.
  - Leave `not_found_handling` and `run_worker_first` alone.
- [ ] **Immutable cache headers for `/assets/*`**
  - `public, max-age=31536000, immutable` for content-hashed assets; `index.html` and `sw.js` stay
    `no-cache`.
  - Resolve Q2 first: `_headers` in the asset dir, or set on the `ASSETS` response in `_worker.ts`.
    The Worker route is the guaranteed fallback.
- [ ] **Verify against a deployed environment**
  - Re-run the two `curl -sSI` probes from DESIGN.md F2/F3 against `dev` and confirm both flipped.

## Phase 2: Recover on the client

Even with retention there will be misses. Today a miss is unrecoverable (F7).

### Tasks

- [ ] **Handle `vite:preloadError`**
  - Listen on `window`, `preventDefault()`, reload once per tab behind a `sessionStorage` guard so a
    genuinely broken deploy cannot loop.
  - Clear the guard on a successful boot.
  - Safe to reload: Composer's state is in OPFS and IndexedDB.
- [ ] **Catch bare dynamic-import rejections**
  - The Vite event only fires for its own preload helper, so it does not cover every failing
    `import()`.
- [ ] **Report the recovery**
  - Count reloads so a deploy that starts shedding chunks is visible rather than silently
    self-healing. Dashboard only, no alert rule.

## Phase 3: Asset retention across deploys

The only change that eliminates the missing chunks rather than degrading them into a reload (F1).
Lands before Phase 4 because background warming assumes the server can still answer (D5).

### Tasks

- [ ] **Decide overlay vs R2** (Q3)
  - Overlay: copy the last N builds' `assets/` into `out/composer` before deploy. Simpler, but
    Cloudflare caps a Worker at 20,000 files and phosphor is already ~9,000. Needs the Phase 0 file
    count.
  - R2: each build uploads `assets/` once, the Worker serves misses from the bucket. No cap, and it
    reuses the 404 branch from Phase 1.
- [ ] **Implement the retention path**
  - Wire into `.github/workflows/scripts/deploy-env.mjs`, which already owns the deploy.
  - Buckets and credentials already exist per environment in `wrangler.jsonc`.
- [ ] **Set the retention window** (Q4)
  - Long enough for a session left open across deploys, which for Composer is days.
  - Include an expiry so the store does not grow without bound.
- [ ] **Test it**
  - Deploy twice to `dev`, then request a chunk that only build N had. It should return the chunk,
    not a 404 and not HTML.

## Phase 4: Split the precache

Turns the update from a blocking serial download of everything (F4) into a fast swap plus a
background warm.

### Tasks

- [ ] **Narrow the workbox manifest to the shell**
  - `index.html`, boot chunks, CSS, fonts, manifest icons. Serial is fine at that size.
  - Keep `createHandlerBoundToURL('/index.html')` and the navigation fallback working.
- [ ] **Add a bounded-concurrency warm for `/assets/*`**
  - Own cache, filled after activation rather than during install, served by `CacheFirst` in the
    same shape as the existing `/phosphor/` route.
  - Pool of 12 to start, retry with backoff (D4).
- [ ] **Keep the progress meter honest**
  - `PRECACHE_PROGRESS` currently counts precache entries. With the shell precached and the bulk
    warmed later, the meter's denominator and its meaning both change.
  - The contract is duplicated in `sw.ts` and `plugin-pwa/capabilities/index.ts` by design; update both.
- [ ] **Confirm the offline guarantee is still acceptable**
  - A plugin never opened is no longer offline-ready until warmed once. Verify the warm actually
    completes in a normal session before accepting that trade.
- [ ] **Measure against Phase 0**
  - Install wall clock and the precache budget check.
- [ ] **Decide on Effect in the worker** (D6)
  - Default is no. Revisit only with a measured `sw.js` size before and after; the worker script is
    refetched on every update check.

## Phase 5: Update UX

Give the web the same "check for updates" affordance as native (F8), and fix the surrounding gaps.

### Tasks

- [ ] **Share `Update.Status` and `Update.Manager`**
  - Lift out of `plugin-native/src/types/Update.ts` so both platforms use one shape.
  - Express the web's collapsed check-and-download states without pretending native's split (D7).
- [ ] **Contribute an `UpdateManager` from plugin-pwa**
  - `check()` calls `registration.update()`; `install()` calls `updateSW(true)`.
  - Status atom fed by the existing `PRECACHE_PROGRESS` bridge, which already carries download progress.
- [ ] **Settings row on both platforms**
  - Model on `plugin-native/src/containers/NativeSettings`, which already renders the whole
    check/install/relaunch flow.
- [ ] **Fix the toast and the poll**
  - The refresh toast lasts 4 minutes and then has no permanent home; the settings row is that home.
  - Revisit the 1-hour `UPDATE_CHECK_INTERVAL`, which can leave a tab an hour behind.

## Sequencing

Phase 0 gates the sizing of everything else. Phase 1 is independent and should ship first regardless.
Phase 2 is independent of 3 and 4. Phase 3 must precede Phase 4 (D5). Phase 5 is independent of all
of them and can run in parallel.

Suggested PRs:

1. Phase 1 (worker 404 + headers), small and self-contained.
2. Phase 2 (client recovery).
3. Phase 3 (retention).
4. Phase 4 (precache split), sized by Phase 0.
5. Phase 5 (update UX), parallel to the rest.

## References

- [DESIGN.md](./DESIGN.md) — findings, decisions, open questions.
- https://github.com/GoogleChrome/workbox/issues/2528 — why precaching is serial.
