# SDK Metrics — Tasks

Metric specs, units, attributes, and the cardinality rationale live in
[DESIGN.md](./DESIGN.md). Task headlines here reference it rather than repeating it.

## Phase 1: Exporter prerequisites — DONE

Defects in the existing OTLP exporter config that would corrupt or bloat anything
added later. All in `packages/sdk/observability` + `packages/common/tracing`; no
new instruments yet.

Verified: `tracing:test` 15/15, `observability:test` 63 passed + 1 skipped, both
packages lint clean, and `composer-app:build` green downstream (285 tasks).

### Tasks

- [x] **Switch counters/histograms to delta temporality** (P1) — `OTLPMetricExporter`
      now takes `temporalityPreference: AggregationTemporalityPreference.DELTA`.
- [x] **Drop `session.id` from the metrics resource** (P2) — extracted
      `createResources()` in `extension.ts`, which builds the logs/traces resource
      (with `session.id`) and a separate metrics resource (without). `OtelMetrics`
      gets the latter. Covered by `extension.test.ts`.
  - Confirmed a `View` could not have done this: `ViewOptions.attributesProcessors`
    operates on datapoint attributes only.
- [x] **Cache instruments in `OtelMetrics`** (P3) — one `Map` per instrument kind, so
      the lookup stays exactly typed without a cast.
- [x] **Add `observe()` to `RemoteMetrics`** (P4) — `observe(name, callback, data): CleanupFn`
      in `packages/common/tracing/src/remote/metrics.ts`, mapped to
      `createObservableGauge`. Threaded through `Metrics`, the `Observability` facade,
      and the OTel `ExtensionApi`.
  - Observations registered before a processor attaches are **replayed** on
    `registerProcessor` — SDK code registers gauges at startup, long before the
    collector exists, so without the replay they would never be read.
  - Tags resolve inside the collection callback, since `did`/`deviceKey` arrive
    asynchronously via `setTags`.
  - `unregisterProcessor` detaches a collector and its observations on shutdown,
    called from `OtelMetrics.close()` before provider shutdown. Without it a closed
    processor kept receiving samples, later observations attached to its dead
    provider, and a re-initialized collector double-reported alongside it.
  - 9 unit tests in `remote/metrics.test.ts` (fan-out, replay, double-register,
    cleanup across late processors, no-processor no-op, unregister, idempotent
    unregister, close-and-reinitialize).
- [x] **Pass `unit`/`description` through, register histogram `View`s** (P5) — added
      `description` to `MetricData` and a `MetricMeta` param on the extension API;
      instruments are created with both. Two non-overlapping explicit-bucket views
      registered for the Phase 3/4 histograms (inert until those instruments exist —
      two matching views would produce duplicate streams, so there is no catch-all).
  - Also tightened `tags?: any` to `Attributes` and made `convertTags` drop nullish
    values, which are not valid OTel attribute values.

## Phase 2: Spaces, documents, memory — DONE

The straightforward gauges, all read at collection time via `observe()`. Lands in
`packages/sdk/observability/src/providers/client-observability.ts`.

### Tasks

- [x] **`dxos.client.spaces.count` + `dxos.client.spaces.ready.count`** — observed in
      `spacesMetricsProvider`, reading `client.spaces.get()` fresh at each collection
      (`SpaceState.SPACE_READY` for the second).
- [x] **Remove the `key` attribute from the existing per-space gauges** — the four
      `dxos.client.space.*` gauges now report device-wide totals.
  - `members`/`objects`/`currentDataMutations` sum; `epoch` takes the **max**, since
    epochs are per-space sequence numbers and adding them means nothing.
- [x] **`dxos.echo.documents.count{location=local|remote}` + `dxos.echo.documents.unsynced.count`**
      — new `documentsMetricsProvider`, registered in `plugin-observability`.
  - Sourced from `db.subscribeToSyncState` via the new `providers/sync-state.ts`, not
    `getSyncSummary` as originally planned: only the former sees feed blocks, and it
    already owns its poll backoff (see Phase 4).
  - `subscribeSyncSummary` is the shared tracker Phase 4 extends; `foldSyncStates` is
    split out as a pure function and unit-tested (5 tests, no mocks).
- [x] **Migrate the existing heap gauges to `observe()` and declare `By` units** — all six
      moved off the 10-minute push timer; names unchanged so SigNoz history is not orphaned.
  - `dxos.client.runtime.*` reads `performance.memory` synchronously at collection time.
  - `dxos.client.services.runtime.*` cannot: it is an RPC. Sampled on a 30s cadence
    (under the 60s export, so a collection never reads a stale sample) with the gauge
    reading the latest value, which keeps the `observe` contract synchronous.
- [x] **`dxos.client.runtime.memory.bytes{scope}`** — new `providers/memory.ts`.
  - Feature-detected (`supportsCrossRealmMemory`), so the four series are registered only
    where `measureUserAgentSpecificMemory` exists; sampled on the same 30s cadence rather
    than inside the collection callback, since it waits for a GC.
  - Unattributed and unrecognised realms bucket to `other` rather than being dropped, so
    the scopes still sum to the total the browser reported. `foldBreakdown` is pure and
    unit-tested (5 tests).
- [ ] **Coordinate names with the `memory-usage` project** — still open.
  - Registry entry owned by jdw; it set the 300-400MB resting target and the
    `scripts/memory/soak.mjs` harness. This phase makes that target verifiable
    fleet-wide instead of on one machine.
  - The contract is now recorded in **both** documents — see "Fleet-wide memory metrics"
    in [`memory-usage/TASKS.md`](../memory-usage/TASKS.md) for the series table, the
    `scope` values, and why the resting-target panel reads `dxos.client.runtime.heapUsed`
    rather than the cross-realm metric. Still open only on jdw's sign-off.

### Staleness fixed after review

- `spacesMetricsProvider` captured `client.spaces.get()` once at provider start, so the
  aggregated per-space gauges missed spaces created later. Deferring this was the wrong
  call: while each space had its own `key`-tagged series, a missing space merely meant a
  missing series, but summed into one number it silently **understates** a total that
  reads as authoritative. Now reads the live list at emit time.
- `SyncStateTracker` never dropped a space removed from the client list, so its last
  backlog persisted in the summary and its subscription leaked until provider disposal.
  Now reconciles on every update. Split out of `subscribeSyncSummary` as a client-free
  class precisely so the add/remove/fold behaviour is testable (6 tests).

## Phase 3: EDGE websocket — DONE

Emitted via `trace.metrics` from `packages/core/mesh/edge-client/src/edge-client.ts`
— that package must not depend on `@dxos/observability`. First real consumer of the
`trace.metrics` contract, which is dead code today.

### Tasks

- [x] **`dxos.edge.ws.reconnect.count{reason}`** counter
  - At the reconnect-listener notification (`edge-client.ts:355`).
  - `classifyCloseCode` / `classifySocketError` in `reconnect-reason.ts`, 8 tests. The enum is
    bounded and never a raw message. Three distinct restart causes exist in the connection, and
    they are diagnostically different, which is what makes the breakdown worth having:
    `onclose` carries a code, `onerror` carries none, and the keepalive watchdog fires when the
    peer went silent while our own pings were flowing.
  - **`navigator.onLine === false` wins over any close code.** A 1006 while the browser has no
    network is a lost connection, not a server fault, and conflating them makes the metric
    useless for the one question it is asked. Hence `offline` is a reason, not an attribute —
    folding it in keeps the enum flat instead of doubling every other value.
  - Added `dxos.edge.ws.session.reconnects`, a gauge of reconnects since the process started.
    That resets on reload, so its value _is_ the per-session total — a delta counter cannot
    answer "how bad was this session" at all, and `session.id` is deliberately not a metric
    attribute (P2).
- [x] **`dxos.edge.ws.connected`** observable gauge (0/1)
  - `avg` across series = fraction of the fleet online, which a counter cannot give.
- [ ] **`dxos.edge.ws.connect.duration{outcome}`** histogram (not done), buckets
      `[0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60]` s
  - Beware the reset-backoff hazard noted at `edge-client.ts:325` — do not treat a
    dial that never opened as a success.

## Phase 4: Sync stuck detection — DONE

The headline ask. Two instruments — neither alone answers it.

### Tasks

- [x] **Sync episode state machine** — `SyncEpisodeTracker` in `providers/sync-episodes.ts`, pure over `(now, pendingWorkCount)`, 9 tests.
  - Fold a stream of `(timestamp, pendingCount)` into: episode open/close transitions,
    and `lastProgressAt` = last time the episode's low-water mark decreased.
  - `pendingCount` is `unsyncedDocumentCount + blocksToPull + blocksToPush`, matching
    `toSpaceUpdate`'s definition of caught-up — a stalled feed backlog is just as stuck
    as a stalled document backlog.
  - Progress is a **decrease** in `unsyncedDocumentCount`, not any state emission —
    a client re-reporting the same backlog must not look healthy. Track the
    low-water mark so concurrent local writes raising the count don't reset it.
  - **First-sample policy**: on the first observation with `unsynced > 0` (provider
    startup, or a tab that reloads mid-backlog), open an episode with
    `openedAt = lastProgressAt = now` — both lower bounds. Without this, an episode
    already in flight has no `0 → non-zero` transition and is invisible to both
    instruments.
  - Truncated episodes are recorded to the histogram and under-report duration;
    do **not** add an `origin` attribute to distinguish them (it doubles the
    histogram's series count to fix a bias `stalled.duration` already covers).
    Episode state is not persisted across reloads — out of scope.
  - Pure function over a sequence, so testable with no mocks. Cover startup and
    reload with a non-zero backlog, not just the transition cases.
- [x] **Non-React cross-space sync aggregator as a `DataProvider`** — `subscribeSyncSummary` gained an `onChange` callback so episodes are folded on every emission, not at collection time: an episode opening and closing inside one 60s export window would otherwise never be recorded.
  - Consume `db.subscribeToSyncState(cb, options)`
    (`packages/core/echo/echo-client/src/proxy-db/database.ts:778`), resubscribing on
    `client.spaces.subscribe`. **Not** `subscribeToAutomergeSyncState` (the
    `useSyncState` path) — that one is automerge-only and does not see feed blocks.
  - The earlier "a poll is required but this provider must not own one" blocker is
    **resolved**: #12561 merged as `8ca2ac7be8`, and `subscribeToSyncState` now owns a
    no-change backoff internally (2s → 15s ceiling, resetting when the backlog moves)
    and already selects the EDGE peer. So add no timer here — consuming the
    subscription is sufficient and introduces no idle churn.
  - Note the earlier claim that the backoff was "not on main" was checked in the wrong
    package (`packages/sdk/client/src/echo`); it landed in `echo-client/src/proxy-db`.
- [x] **`dxos.echo.sync.episode.duration`** histogram, buckets
      `[1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]` s
  - min/avg/max come off the histogram's own `.min` / `.max` series and a `.sum / .count`
    formula. Percentiles remain available here — unlike the gauges, a histogram is the one
    instrument type SigNoz will compute them for.
- [x] **`dxos.echo.sync.stalled.duration`** observable gauge
  - "Time unsynced without progress". Required because an episode that never closes
    never records a histogram sample — a permanently stuck client is invisible in
    `episode.duration` by construction.

## Phase 6: Runtime responsiveness — DONE

Event loop lag and RPC timings. The user recalled worker-framework already having these;
what it actually had was `RpcTiming` (queue wait + service time in a 100-sample ring buffer,
read only via `getStatsSnapshot`) and **no event-loop-lag metric at all**.

### Tasks

- [x] **`dxos.client.runtime.eventLoop.lag`** observable gauge, `s`
  - `EventLoopLagTracker` (`providers/event-loop-lag.ts`) probes every 500ms and reports the
    **peak per export window**, not an instantaneous value: a gauge read only at collection
    time can never observe a stall, because a blocked loop delays the collection callback too.
  - Grouped by the `dxos.process.type` resource attribute, so one provider separates the tab
    from the shared and dedicated workers with no per-realm wiring. 6 tests.
- [x] **`dxos.rpc.queueWait.duration` + `dxos.rpc.service.duration`** histograms, `s`
  - Emitted from `RpcTiming.recordSample` via `trace.metrics`, so worker-framework took a
    dep on `@dxos/tracing` and none on `@dxos/observability` — the emission contract holds.
  - Queue wait is the cross-thread responsiveness signal: time the message spent waiting for
    the receiving thread rather than time spent working. It is what makes worker lag visible
    from the tab without instrumenting the worker.
  - **Untagged by design.** `rpc._tag` is the interesting breakdown but would multiply a
    12-series histogram by the method count — more series than the whole rest of the fleet's
    metrics. Per-method detail stays in the existing log line and `getStatsSnapshot`.
  - Explicit bucket views registered (`[0.01 … 10]s`), since the default boundaries are
    ms-shaped.

## Phase 7: Review pass — DONE

Audit of everything added so far, once the live instance had taught us what the backend
actually supports.

### Tasks

- [x] **Event loop lag no longer resets on read.** `takeMaxMs()` was destructive, which breaks
      the moment the callback runs twice in a window — a second `RemoteMetrics` processor, or a
      `flush()` landing beside a periodic collection, both cause that. The window is now rotated
      on the export cadence and `peakMs` is a plain idempotent getter, asserted by a test that
      reads it three times.
- [x] **`OtelMetrics` builds its attribute set once per record.** It was calling `getTags()` and
      spreading twice per sample — fine when only providers emitted, but `RpcTiming` now
      publishes per RPC, so that was allocation on a hot path.
- [x] **Added `dxos.echo.sync.pending.count`.** The only pending signal was documents-only, while
      the episode and stall instruments key off documents + feed blocks. The dashboard and the
      stall alert now read the same definition the instruments do.
- [x] **Event loop lag split into two panels**, main thread and workers. They mean different
      things: main-thread lag is felt directly as UI jank, whereas worker lag surfaces as RPC
      queue wait.
- [x] **Verified the space aggregates are not last-write-wins.** Removing the `key` attribute
      could have left four gauges each overwriting the previous space's value within a window;
      they do reduce properly, and `epoch` correctly takes a max rather than a sum.

## Phase 8: Verified against the live instance — worker coverage

Checked what each realm actually reports rather than assuming.

`dxos.process.type` has two observed values, `browser` and `dedicated-worker`, so the worker
**does** export — via `trace.metrics` from SDK code running there (the echo replication and
collection-sync histograms). Three gaps that only the live data revealed:

### Tasks

- [x] **The worker registered no data providers, so it reported no provider-based metrics.**
      `initializeObservability` runs in the dedicated worker, but the providers were registered
      by `plugin-observability`'s client-ready capability, which runs only in the tab. Confirmed
      by query: `eventLoop.lag` existed for `browser` only. Moved the lag provider into
      `initializeObservability` (composer's `config.ts`), which both realms call, and removed the
      now-duplicate plugin registration.
- [x] **Event loop lag counted background-tab throttling as jank.** A hidden tab has its timers
      throttled or frozen, so a probe firing a minute late looks like a minute of lag — the live
      `browser` series averaging ~23s was this, not real jank.
  - **The first fix was wrong.** Checking `document.visibilityState` when the probe fires cannot
    work: with timers frozen outright, _no probe fires during the freeze_, so the gate never runs
    and the first probe after the tab wakes still observes the whole gap. Confirmed in practice —
    lag was still reported above a minute after that change.
  - The real guard is in the tracker: a gap past `MAX_PLAUSIBLE_LAG_MS` (10s) is **discarded**,
    not clamped, because clamping would still report a ceiling-valued stall that never happened.
    This needs no cooperation from any listener and works in worker realms with no `document` —
    which matters, since Chrome throttles the workers a hidden tab owns as well.
  - 10s is the threshold because a main thread genuinely blocked that long means the app is hung
    rather than janky; past that point a false reading is worse than a missed one.
  - The `visibilitychange` listener stays as a refinement: it drops the reference timestamp on
    transition, so a sub-clamp gap around a visibility change is discarded too.
  - 15 tests, including the frozen-timer case with no `suspend()` call, a real 4s stall still
    being reported, and a discarded probe not erasing a real stall from the same window.
- [x] **Enabled RPC timing on the client-services channel.** The middleware is opt-in
      (`RpcTiming.isEnabled(options?.timing)`) and nothing in the app passed `timing`, so
      `recordSample` never ran and neither histogram was ever recorded.
  - Set on **both** ends in `client-protocol/src/service-rpc.ts` — the server in `ClientRpcServer`
    and the client in `makeClientServicesRpc`. They must agree: the middleware is
    `requiredForClient`, so a server applying it against a client that does not would reject
    every request.
  - The in-process path (`makeInProcessClientServicesRpc`) is deliberately left alone: no wire
    hop means no queue wait to measure, and it never wraps the group, so there is no mismatch.
  - Cost per RPC is a `Date.now()` pair plus one header. The existing log line stays gated at
    `minLogMs` (100ms), so enabling this adds metrics without adding log volume.
  - Verified no handshake regression: client-services 165 passed, client 30 passed,
    client-protocol 4 passed, worker-framework 17 passed.

## Phase 9: Deployed environments

Checked what a deploy actually needs, rather than assuming.

**Nothing, for metrics to flow.** `DX_OTEL_ENDPOINT=/api/otel` is already set in every deployed
env file, and `/api/otel` is the Worker's SigNoz reverse proxy, which injects
`signoz-ingestion-key` from the `SIGNOZ_INGESTION_KEY` Worker secret server-side
(`composer-app/src/functions/_worker.ts`). So no ingestion key ever reaches a deployed browser —
which is also why the open `moon.yml` credential finding is a **local-bundle** problem only.
`metrics: true` is already passed in `config.ts`. Everything added in this project starts
exporting on the next deploy with no further action.

### Tasks

- [x] **Set `DX_ENVIRONMENT` per deployed environment.** It was set nowhere but `check.yml`
      (`ci`), so every deployed client reported `deployment.environment: unknown` and production
      was indistinguishable from preview on any dashboard — the same defect fixed for local via
      `dx-local.yml`, but fleet-wide. Now `dev` / `preview` / `staging` / `production` in
      `.github/workflows/env/*`, with `default` left explicit as `unknown`.
- [ ] **Grant `SIGNOZ_INGESTION_KEY` to any new Worker** — per-Worker secret matched by a
      1Password section named after the raw Worker name, so a newly added environment needs
      `pnpm secrets remote <env> composer` before its clients can export.

## Phase 5: Dashboard and validation

Blocked on SigNoz auth — the `signoz` MCP server is configured but unauthenticated,
and nothing has been verified against a live instance.

### Tasks

- [x] **Authorize the `signoz` MCP server** — done; reads work. **Writes do not**: the MCP
      service account has no `dashboard:update` permission, so the dashboard cannot be
      published from here.
- [ ] **Grant the MCP service account dashboard write access**, or import
      [`dashboard.json`](./dashboard.json) through the SigNoz UI. The spec is built and
      validated (10 panels, every layout `$ref` resolves) — only publishing is blocked.
  - Generated by [`build-dashboard.py`](./build-dashboard.py) rather than hand-edited, so
    the JSON stays consistent when a panel changes. It asserts the invariant that tripped
    the first import: **a panel takes exactly one entry in `queries`** — several series go
    in one `signoz/CompositeQuery`, never as sibling entries. Single-series panels use
    `signoz/BuilderQuery` directly.
- [x] **Confirm the metrics arrive** — verified against the live instance: `spaces.count`,
      `spaces.ready.count`, `documents.count{local,remote}`, `documents.unsynced.count` and
      the three `runtime.heap*` gauges all landed, tagged `ctx.tag=local-dm`,
      `dxos.process.type=browser`. Declared units (`{space}`, `{document}`, `By`) are
      present, which the pre-existing `dxos.client.*` metrics lack — proof the P5 fix is
      live. `runtime.memory.bytes` is absent, as expected without cross-origin isolation.
- [ ] **Cardinality check** — `signoz_check_metric_cardinality` on the existing
      `dxos.client.*` series to quantify what `session.id` and `key` already cost, and
      confirm the 65-series-per-device budget in DESIGN.md after Phases 1-4.
  - Histograms are 37 of those 65 series; if the number has to come down, cut
    bucket boundaries before attributes.
- [x] **Build the dashboard** — spec authored as `dashboard.json`; see the blocked publish above.
  - Spaces: `avg`/`min`/`max` of `dxos.client.spaces.count` across devices — **not** p90:
    SigNoz only supports percentile space aggregation on histograms (see DESIGN.md
    "Gauges cannot give fleet percentiles").
  - Connectivity: `avg` of `dxos.edge.ws.connected`; `sum by (reason)` rate of
    `dxos.edge.ws.reconnect.count`.
  - Documents: `avg`/`max` of `dxos.echo.documents.count{location=local}`.
  - Sync: `max`/`p99` of `dxos.echo.sync.episode.duration`; count of devices with
    `dxos.echo.sync.stalled.duration > 600`.
  - Memory: `avg`/`max` of `dxos.client.runtime.heapUsed` against the 300-400MB target;
    `dxos.client.runtime.memory.bytes` stacked by `scope`.
  - [ ] **Decide whether `heapUsed` also gets a histogram**, which is the only way to get a
        real fleet p90/p99 on it. Costs `boundaries + 3` series; deferred until the memory
        target moves from measurement to enforcement.
- [ ] **Alert: sync stuck**
  - `dxos.echo.sync.stalled.duration > 600`, with no second condition: the gauge is 0
    whenever the client is caught up, so an `unsynced.count > 0` conjunct is redundant
    and would suppress the alert for a feed-only backlog.
- [ ] **Alert: heap pressure**
  - `dxos.client.runtime.heapUsed / dxos.client.runtime.heapSizeLimit > 0.9` — the
    ratio is computed in SigNoz, not exported as a third metric. This is the
    imminent-OOM-kill predictor.
- [ ] **End-to-end check** — Composer against a local OTLP endpoint, confirm every
      series lands with the intended unit and attribute set.
  - `await observability.flush()` before asserting, and confirm that call actually
    drains the metric reader — the export interval is 60s, so a short run otherwise
    reports false missing series. `test/e2e/tracing-invitation.test.ts:160` already
    uses this pattern for traces.

### Surfaced by the live instance

- **`deployment.environment` is `unknown` for local runs.** `DX_ENVIRONMENT` is absent from
  `.env`, and `config.ts` falls back to `'unknown'`, so local traffic is not separable from
  any other unlabelled source by environment alone. Add `DX_ENVIRONMENT=local` to `.env`;
  until then `ctx.tag` is the only reliable discriminator.
- **A pre-existing `dxos.echo.space.count` already exists**, distinct from this project's
  `dxos.client.spaces.count`. Two space counts under different prefixes is a trap for panel
  authors — reconcile before the dashboard is shared, keeping whichever the fleet already
  queries.
- The `dxos.echo.collection-sync.*` and `dxos.echo.replication.*` histograms export
  **cumulative**, so they come from a different exporter than the browser `OtelMetrics`
  this project set to delta. Any rate panel over those needs the cumulative treatment.

## References

- [DESIGN.md](./DESIGN.md) — metric table, units, attributes, cardinality budget.
- `tracing` skill — `TRACE_PROCESSOR`, `trace.metrics`, `RemoteMetrics`.
- SigNoz metrics storage: `time_series_v4` / `samples_v4` (+ `_agg_5m`, `_agg_30m`
  rollups), Gorilla+ZSTD on values, hard TTL, **no write-time sampling** — which is
  why label choice is the only cost lever.
