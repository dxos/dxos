# Composer asset delivery — design

How Composer's build artifacts reach a browser: what the deploy serves, what the service worker
caches, and how a client moves from one build to the next. Two symptoms drove this, and they share a
root cause.

- Lazily imported chunks go missing after a deploy.
- A PWA update takes a very long time to download, and there is no way to ask for one.

## Findings

Each numbered finding was verified against the code or against production on 2026-09-08. The
verification is recorded so a later session does not have to redo it.

### F1. A deploy makes the previous build's chunks unreachable

Every `wrangler deploy` replaces the asset manifest. Only the current version's manifest is served,
so the moment a new version goes live the previous build's content-hashed chunks stop resolving. A
session that loaded `index.html` from build N and lazily imports a chunk after build N+1 lands has
nowhere to get it.

### F2. Missing assets return `index.html` with a 200, not a 404

`not_found_handling: "single-page-application"` in `packages/apps/composer-app/wrangler.jsonc`
applies to every unmatched path, asset paths included.

```
$ curl -sSI https://composer.space/assets/does-not-exist-abc123.js
HTTP/2 200
content-type: text/html
```

A dynamic import therefore receives an HTML document with a success status. The browser reports a
module parse or MIME failure rather than a missing file, which is why these read as unrelated
mystery crashes rather than as one deploy problem.

### F3. Content-hashed assets are served `must-revalidate`

```
$ curl -sSI https://composer.space/assets/async-D15Zo-_P.js
cache-control: public, max-age=0, must-revalidate
etag: "cc2ca94412054e717b3290f6109d0146"
```

Permanently immutable files pay a conditional request on every load and on every service worker
install. `index.html` carries the same header, which is correct for it.

### F4. Workbox precaches strictly one entry at a time

`workbox-precaching@7.4.0`, `PrecacheController.install`:

```js
// Cache entries one at a time.
// See https://github.com/GoogleChrome/workbox/issues/2528
for (const [url, cacheKey] of this._urlsToCacheKeys) {
  ...
  await Promise.all(this.strategy.handleAll({ params: { cacheKey }, request, event }));
}
```

That issue reports `net::ERR_INSUFFICIENT_RESOURCES` in Chrome caused by workbox's older unbounded
`Promise.all` over the whole manifest, and asks for batching in chunks of 20. Workbox went to 1
instead. The hazard is real; the remedy overshot.

`packages/apps/composer-app/vite.config.ts` globs `**/*.{js,css,html,ico,png,svg,wasm,woff2}` with
only `/phosphor/**` excluded, so the manifest is every lazy chunk of every plugin plus wasm and
fonts. Serial install over that many entries is the download cost users feel.

### F5. Precache installs go through the browser HTTP cache

`PrecacheController.js:103`:

```js
const cacheMode = typeof entry !== 'string' && entry.revision ? 'reload' : 'default';
```

`vite-plugin-pwa@1.2.0` sets `dontCacheBustURLsMatching` to `^assets`, so everything under
`/assets/` enters the manifest with `revision: null` and is fetched with `cache: 'default'`.

This is what makes F3 expensive twice over. Chunks that did not change between two builds keep the
same hashed filename, so with an immutable header an install could skip them entirely at zero
network cost. Under `max-age=0, must-revalidate` each one still costs a conditional request.

### F6. F1 and F4 are the same bug

Workbox's activate step evicts precache entries absent from the new manifest, and the server has
already dropped them (F1). Any tab that does not reload on `controllerchange` is then running code
whose lazy chunks exist in neither the cache nor the server. A slow install (F4) widens that window
from seconds to minutes.

### F7. There is no client-side recovery

Nothing in the repo handles `vite:preloadError` or a rejected dynamic import. The only match for
that error text is an unrelated unit test in `OperationHandlerSet.test.ts`.

### F8. The web has no way to ask for an update

`packages/plugins/plugin-pwa/src/capabilities/index.ts` holds the registration and polls
`registration.update()` hourly, and the precache progress plumbing already streams install progress
into the registry. What is missing is a status atom and a settings surface. The refresh toast lasts
4 minutes and has no permanent home, so a user who misses it cannot get back to it.

`packages/plugins/plugin-native/src/capabilities/updater.ts` and its `Update.Status` union are the
working template.

## Decisions

**D1. Fix the 404 in the Worker, not by changing `not_found_handling`.** Every request already
passes through `_worker.ts` as `main`, so a content-type check on the asset response costs nothing
and leaves SPA routing intact for real navigations.

**D2. Cache headers before concurrency.** F5 makes immutable headers a certainty rather than a
guess, and they may shrink the install enough to change what else is worth building. Sizing the
later phases against a build that still revalidates every chunk would measure the wrong thing.

**D3. Precache the shell, warm the rest in the background.** Concurrency is not reachable inside
`precacheAndRoute`, and routing cannot be shared with a cache populated outside workbox's
URL-to-cache-key map. So split: workbox precaches `index.html`, boot chunks, CSS, fonts and manifest
icons, where serial is fine; everything else goes to a separate cache filled by a bounded pool and
served by a `CacheFirst` route on `/assets/*`, in the same shape as the existing `/phosphor/` route.
Fill after activation rather than during install so the update stops blocking on it.

**D4. Bound the pool at 8 to 20.** Unbounded is what broke Chrome in workbox#2528. Start at 12 and
measure.

**D5. Retention makes D3 safe.** Warming after activation means a chunk can be requested before it
is cached. That is only survivable if the previous build's assets still resolve on the server, so
retention lands before the precache split.

**D6. Do not rewrite the service worker in Effect.** `sw.ts` duplicates the `PRECACHE_PROGRESS`
contract rather than importing it, with the comment "so the worker bundle stays free of host code",
and `_worker.ts` carries a matching note about keeping Automerge's wasm out. The worker is
deliberately a standalone artifact. Effect would express the bounded pool, retry and interruption
well, and would tidy the hand-rolled lifecycle reasoning in `sw.ts` (sampling `isUpdate` at startup
to dodge a race, inferring completion from a `statechange` listener). But a bounded pool with retry
is about twenty lines of plain async code, and the worker script is refetched on every update check,
which makes it the one file where bytes are paid repeatedly. Revisit only against a measured
before/after size (Phase 4).

**D7. Web update states are not native's.** On native, check and install are separate acts. On the
web `registration.update()` installs the new worker, which precaches as part of installing, so
asking "an update is available, download it?" would mean the download already happened. The shared
`Update.Status` has to express Check, Installing (with progress) and Reload now without pretending
otherwise.

## Open questions

- **Q1.** How many precache entries are there, and how long does a real update install take? Nothing
  after Phase 0 is properly sized until this is measured.
- **Q2.** Does `_headers` in the asset directory apply to Workers Static Assets under a Worker
  `main`, or do the headers have to be set on the `ASSETS` response in `_worker.ts`? The Worker route
  is the guaranteed fallback.
- **Q3.** Overlay the previous builds' `assets/` into the deploy directory, or serve misses from R2?
  Overlay is simpler but Cloudflare caps a Worker at 20,000 files and the phosphor catalog is already
  ~9,000. R2 has no such cap and reuses the 404 branch from Phase 1. Decide on the file count.
- **Q4.** How many builds of retention? Long enough to cover a session that stays open across
  deploys, which for Composer is days rather than hours.

## References

- `packages/apps/composer-app/wrangler.jsonc` — asset routing, `not_found_handling`, `run_worker_first`.
- `packages/apps/composer-app/src/functions/_worker.ts` — the Worker entry every request passes through.
- `packages/apps/composer-app/src/sw.ts` — precache, navigation fallback, runtime icon caching, progress ticks.
- `packages/apps/composer-app/vite.config.ts` — `VitePWA` config, `injectManifest` globs.
- `packages/plugins/plugin-pwa/src/capabilities/index.ts` — registration, update poll, progress bridge.
- `packages/plugins/plugin-native/src/types/Update.ts` — the `Status` / `Manager` shape to share.
- `packages/apps/composer-app/scripts/check-boot-budget.mjs` — existing budget check to model a precache budget on.
- https://github.com/GoogleChrome/workbox/issues/2528 — why precaching is serial.
