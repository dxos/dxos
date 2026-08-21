# SDK Metrics — Tasks

Metric specs, units, attributes, and the cardinality rationale live in
[DESIGN.md](./DESIGN.md). Task headlines here reference it rather than repeating it.

## Phase 1: Exporter prerequisites

Defects in the existing OTLP exporter config that would corrupt or bloat anything
added later. All in `packages/sdk/observability` + `packages/common/tracing`; no
new instruments yet.

### Tasks

- [ ] **Switch counters/histograms to delta temporality** (P1)
  - `OTLPMetricExporter` in `packages/sdk/observability/src/extensions/otel/metrics.ts`
    takes no `temporalityPreference`, so it exports cumulative; browser reloads then
    read as counter resets in SigNoz.
- [ ] **Drop `session.id` from the metrics resource** (P2)
  - `extension.ts` stamps it as a resource attribute, so it lands on metrics too —
    one new ClickHouse fingerprint per page reload, forever.
  - Build a **separate resource for `MeterProvider`** — `extension.ts` hands one
    resource object to logs, metrics, and traces alike. A `View` cannot do this:
    `attributeKeys` filters datapoint attributes, not provider-level resource
    attributes.
  - Add an exported-payload test: `session.id` absent from metrics, present on
    traces and logs.
- [ ] **Cache instruments in `OtelMetrics`** (P3)
  - `createGauge`/`createCounter` are currently called on every single record.
- [ ] **Add `observe()` to `RemoteMetrics`** (P4)
  - `packages/common/tracing/src/remote/metrics.ts`: `observe(name, () => value, data): CleanupFn`,
    mapped to `createObservableGauge` in `OtelMetrics`.
  - Unblocks every gauge in Phases 2-4; also fixes the 10-min-poll vs 60s-export
    sparsity in the existing providers.
  - Unit test the fan-out + cleanup in `packages/common/tracing`.
- [ ] **Pass `unit`/`description` through, register histogram `View`s** (P5)
  - `MetricData.unit` is currently discarded. Default OTel bucket boundaries are
    ms-shaped and cap at 10,000 — wrong for the seconds-scale durations below.

## Phase 2: Spaces, documents, memory

The straightforward gauges, all read at collection time via `observe()`. Lands in
`packages/sdk/observability/src/providers/client-observability.ts`.

### Tasks

- [ ] **`dxos.client.spaces.count` + `dxos.client.spaces.ready.count`**
  - In `spacesMetricsProvider` (`client-observability.ts:165`).
- [ ] **Remove the `key` attribute from the existing per-space gauges**
  - `dxos.client.space.{members,objects,epoch,currentDataMutations}` are tagged
    `key: data.key` — one series per space per device, unbounded in spaces created.
  - Report aggregates instead; per-space drilldown belongs in traces.
- [ ] **`dxos.echo.documents.count{location=local|remote}` + `dxos.echo.documents.unsynced.count`**
  - Sourced from `getSyncSummary()` (`packages/sdk/client/src/echo/util.ts:23`),
    which already folds per-space `PeerState` into one fleet-comparable summary.
- [ ] **Migrate the existing heap gauges to `observe()` and declare `By` units**
  - `dxos.client.runtime.{heapUsed,heapTotal,heapSizeLimit}` and
    `dxos.client.services.runtime.{rss,heapTotal,heapUsed}` in
    `runtimeMetricsProvider` (`client-observability.ts:119`) — today they are sync
    `gauge()` calls on a 10-min timer against a 60s export, so the series are mostly
    gaps and no percentile panel works.
  - Keep the existing names so SigNoz history is not orphaned.
- [ ] **`dxos.client.runtime.memory.bytes{scope}`** observable gauge
  - `performance.memory` is main-thread + Chromium only, so Composer's shared and
    dedicated workers — the largest consumers — are unmeasured today.
  - Use `performance.measureUserAgentSpecificMemory()`: feature-detect it (needs
    cross-origin isolation), and read it on its own cadence, not inside the
    collection callback — it waits for a GC before resolving.
  - Bounded `scope` enum: `window | shared-worker | dedicated-worker | other`.
- [ ] **Coordinate names with the `memory-usage` project**
  - Registry entry owned by jdw; it set the 300-400MB resting target and the
    `scripts/memory/soak.mjs` harness. This phase makes that target verifiable
    fleet-wide instead of on one machine.

## Phase 3: EDGE websocket

Emitted via `trace.metrics` from `packages/core/mesh/edge-client/src/edge-client.ts`
— that package must not depend on `@dxos/observability`. First real consumer of the
`trace.metrics` contract, which is dead code today.

### Tasks

- [ ] **`dxos.edge.ws.reconnect.count{reason}`** counter
  - At the reconnect-listener notification (`edge-client.ts:355`).
  - `reason` must be a bounded enum mapped from close code / error class
    (`normal`, `going_away`, `abnormal`, `network`, `auth`, `identity_changed`,
    `other`) — never a raw error message.
- [ ] **`dxos.edge.ws.connected`** observable gauge (0/1)
  - `avg` across series = fraction of the fleet online, which a counter cannot give.
- [ ] **`dxos.edge.ws.connect.duration{outcome}`** histogram, buckets
      `[0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60]` s
  - Beware the reset-backoff hazard noted at `edge-client.ts:325` — do not treat a
    dial that never opened as a success.

## Phase 4: Sync stuck detection

The headline ask. Two instruments — neither alone answers it.

### Tasks

- [ ] **Sync episode state machine** (pure, unit-tested)
  - Fold a stream of `(timestamp, unsyncedDocumentCount)` into: episode open/close
    transitions, and `lastProgressAt` = last time the episode's low-water mark
    decreased.
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
- [ ] **Non-React cross-space sync aggregator as a `DataProvider`**
  - Same shape as `useSyncState` (`packages/sdk/react-client/src/echo/useSyncState.ts`):
    `space.internal.db.subscribeToAutomergeSyncState` filtered to the EDGE peer via
    `isEdgePeerId`, resubscribing on `client.spaces.subscribe`.
  - **A poll is required, but this provider must not own one.** The subscription
    alone gets stuck — hence the existing 1Hz poll and its TODO in
    `SpaceProxy._syncToEdge` (`space-proxy.ts:770`). But standing up a second timer
    re-creates the idle churn that memory-usage PR #12561 exists to remove.
  - **Blocking decision, resolve before writing the provider:** #12561's backed-off
    sync-state ticker is not on `main` yet (verified — no backoff in
    `packages/sdk/client/src/echo`), so there is no source to name today. Either
    (a) wait for #12561 and consume whatever it exposes, or (b) land a shared
    backed-off sync-state source first and have both this provider and the UI read
    it. Do **not** proceed by adding a private timer.
- [ ] **`dxos.echo.sync.episode.duration`** histogram, buckets
      `[1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]` s
  - "Longest stretch to sync" = `max` over merged buckets in SigNoz; `p99` for the tail.
- [ ] **`dxos.echo.sync.stalled.duration`** observable gauge
  - "Time unsynced without progress". Required because an episode that never closes
    never records a histogram sample — a permanently stuck client is invisible in
    `episode.duration` by construction.

## Phase 5: Dashboard and validation

Blocked on SigNoz auth — the `signoz` MCP server is configured but unauthenticated,
and nothing has been verified against a live instance.

### Tasks

- [ ] **Authorize the `signoz` MCP server** (user action, interactive session)
- [ ] **Cardinality check** — `signoz_check_metric_cardinality` on the existing
      `dxos.client.*` series to quantify what `session.id` and `key` already cost, and
      confirm the 65-series-per-device budget in DESIGN.md after Phases 1-4.
  - Histograms are 37 of those 65 series; if the number has to come down, cut
    bucket boundaries before attributes.
- [ ] **Build the dashboard**
  - Spaces: `avg`/`p90`/`max` of `dxos.client.spaces.count` across devices.
  - Connectivity: `avg` of `dxos.edge.ws.connected`; `sum by (reason)` rate of
    `dxos.edge.ws.reconnect.count`.
  - Documents: `avg`/`p90` of `dxos.echo.documents.count{location=local}`.
  - Sync: `max`/`p99` of `dxos.echo.sync.episode.duration`; count of devices with
    `dxos.echo.sync.stalled.duration > 600`.
  - Memory: `p50`/`p90`/`max` of `dxos.client.runtime.heapUsed` against the
    300-400MB target; `dxos.client.runtime.memory.bytes` stacked by `scope`.
- [ ] **Alert: sync stuck**
  - `dxos.echo.sync.stalled.duration > 600` while
    `dxos.echo.documents.unsynced.count > 0`.
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

## References

- [DESIGN.md](./DESIGN.md) — metric table, units, attributes, cardinality budget.
- `tracing` skill — `TRACE_PROCESSOR`, `trace.metrics`, `RemoteMetrics`.
- SigNoz metrics storage: `time_series_v4` / `samples_v4` (+ `_agg_5m`, `_agg_30m`
  rollups), Gorilla+ZSTD on values, hard TTL, **no write-time sampling** — which is
  why label choice is the only cost lever.
