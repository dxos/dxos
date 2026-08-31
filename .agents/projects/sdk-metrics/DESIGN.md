# SDK Metrics — Design

## Goal

Instrument the DXOS SDK with a small, fixed set of OTel metrics that answer five
operational questions about the deployed client fleet, and surface them on a
SigNoz dashboard:

1. How many spaces does a client hold?
2. How often does the EDGE websocket reconnect?
3. How many documents does a client have loaded?
4. **Is sync stuck** — what is the longest stretch a client takes to reach a
   synced state, and how long has a client been unsynced without making
   progress?
5. How much memory does a client use, and how close is it to the heap limit?

Non-goals: tracing changes, log volume changes, per-space or per-object
drilldown (see [Cardinality budget](#cardinality-budget)).

## What already exists

The whole SDK → OTel → OTLP → SigNoz path is built and enabled in Composer.
This project adds instruments to it; it does not build the pipeline.

| Piece                                | Location                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Collector-free SDK facade            | `RemoteMetrics` in `packages/common/tracing/src/remote/metrics.ts`, exposed as `trace.metrics` (`packages/common/tracing/src/api.ts:203`) |
| OTel meter + OTLP exporter           | `OtelMetrics` in `packages/sdk/observability/src/extensions/otel/metrics.ts` — registers itself as a `RemoteMetrics` processor            |
| Endpoint / resource / tag resolution | `packages/sdk/observability/src/extensions/otel/extension.ts`                                                                             |
| Metric producers                     | `packages/sdk/observability/src/providers/client-observability.ts`                                                                        |
| Provider registration                | `packages/plugins/plugin-observability/src/capabilities/client-ready.ts:48-60`                                                            |
| Enabled for Composer                 | `packages/apps/composer-app/src/util/config.ts:90` (`metrics: true`)                                                                      |

## The two emission contracts

Deep SDK packages have no `Observability` handle, so there are two paths and the
choice is mechanical:

1. **`trace.metrics` (`@dxos/tracing`)** — for anything inside `@dxos/edge-client`,
   `@dxos/echo-client`, `@dxos/echo-host`. Zero OTel dependency; fans out to zero
   processors until `OtelMetrics` registers one, so no-collector means no cost and
   telemetry opt-out is "never register". **These packages must never depend on
   `@dxos/observability`.**
2. **`observability.metrics` via a `DataProvider`** — for anything that needs the
   `Client` API surface (space counts, aggregated sync state). Lives in
   `packages/sdk/observability/src/providers/`.

`trace.metrics` is currently dead code — nothing in the SDK calls it. This project
is its first real consumer.

## Prerequisite exporter fixes

These are defects in the existing exporter config that would corrupt or bloat the
new metrics. They land before the instruments.

### P1 — Delta temporality

`OTLPMetricExporter` is constructed with no `temporalityPreference`, so counters
and histograms export **cumulative**. Browser clients are short-lived and reload
constantly; a cumulative counter restarting at 0 every reload reads as a counter
reset in SigNoz and corrupts every `rate`/`increase` panel. Set delta temporality
for counters and histograms.

### P2 — Drop `session.id` from the metrics resource

`extension.ts` stamps `'session.id': crypto.randomUUID()` as a **resource**
attribute, so it lands on metrics as well as traces/logs. SigNoz stores metrics as
`(fingerprint, unix_milli, value)` in ClickHouse `samples_v4` keyed on the full
label set — a fresh UUID per page reload mints a permanent new fingerprint whose
samples never merge with anything. Compression (Gorilla + ZSTD on values) does
nothing about series count. Keep `session.id` on traces and logs; drop it from
metrics.

The fix must be a **separate resource for the metrics provider**, not a `View`.
`extension.ts` builds one resource and hands the same object to `OtelLogs`,
`OtelMetrics`, and `OtelTraces`; `OtelMetrics` passes it straight to
`MeterProvider`. OTel `View`s filter _datapoint attributes_ via `attributeKeys` —
they have no reach into provider-level resource attributes, so a view cannot strip
this. If a custom exporter transform is used instead, it needs an exported-payload
test asserting `session.id` is absent from metrics and present on traces and logs.

### P3 — Cache instruments

`OtelMetrics.gauge/increment/distribution` call `createGauge(name)` /
`createCounter(name)` on **every** record. The SDK dedupes by descriptor so it is
correct, but it allocates per call on a hot path. Hold a `Map<string, Instrument>`.

### P4 — `observe()` on `RemoteMetrics`

`MetricsMethods` is push-only, which is why the existing providers poll on a
10-minute timer while `EXPORT_INTERVAL` is 60s — 9 of every 10 export windows carry
no datapoint, producing sparse series that break `avg`/percentile panels. Add:

```ts
observe(name: string, callback: () => number | undefined, data?: MetricData): CleanupFn;
```

mapped to `createObservableGauge` in `OtelMetrics`, so "current value" metrics are
read at collection time. **Every gauge in this project uses `observe`, not `gauge`.**

In scope, and required before release: `dxos.client.runtime.*` and
`dxos.client.services.runtime.*` — the Memory section depends on them being observed,
since on the 10-minute push cadence their series are too sparse to average.
Explicitly **out of scope**: `dxos.client.network.*`, which this project does not
touch and which keeps its existing push cadence.

### P5 — Honor `unit` and `description`

`MetricData.unit` exists and is dropped on the floor by `OtelMetrics`. Pass it
through, and add `description`. Also register explicit histogram bucket boundaries
via a `View` — the OTel default boundaries top out at 10,000 and are shaped for
milliseconds, which is wrong for the seconds-to-minutes durations below.

## Gauges cannot give fleet percentiles

Verified against the live instance, and it contradicts an earlier assumption in this
document: **SigNoz rejects percentile space aggregation on a gauge.**

```
invalid space aggregation `p90` for metric type `gauge`,
percentile space aggregations are only supported for `histogram`,
`exponentialhistogram` metric types
```

A gauge supports `sum`, `avg`, `min`, `max`, `count` across series; time aggregation is
equally percentile-free. So "the p90 client holds N spaces" is **not** obtainable from
`dxos.client.spaces.count` as a gauge, however many series exist — the per-device series
are there, but the query layer will not compute a quantile over them.

This is the same mergeability argument the sync section already makes, applied in the
other direction: a percentile has to be derived from bucket counts, so the backend will
only compute one where buckets exist. Three ways out, in increasing cost:

1. **Accept `avg` / `min` / `max`.** One series per metric, no code change. `max` already
   answers "is any client pathological", which is most of the operational value. Note a
   histogram gives these too: SigNoz exposes `.min` and `.max` series alongside the buckets,
   and `avg` is `.sum / .count` — so `episode.duration` reports min/avg/max _and_ keeps
   percentiles.
2. **Export the metric as a histogram as well as a gauge**, when the distribution is the
   question rather than the extremes. Real percentiles, mergeable across the fleet, at
   `boundaries + 3` series each — see [Budget](#budget), where histograms already dominate.
   The strongest candidate is `heapUsed`, since the 300-400MB resting target is inherently
   a distribution question.
3. **A ClickHouse SQL panel** computing `quantile(0.9)(value)` over the raw samples.
   Sidesteps the builder's restriction without new instruments, at the cost of a panel that
   no longer shares the builder's variable handling and has to be maintained as SQL.

Current decision: option 1 everywhere, because no gauge here has a settled distribution
question yet. Revisit for `heapUsed` when the memory target moves from "measure it" to
"hold the line on it".

## Metrics to add

Names follow the existing `dxos.<subsystem>.…` convention. Units use UCUM as OTel
requires (`s` for seconds, `{thing}` for dimensionless counts).

### Spaces

| Metric                           | Instrument       | Unit      | Attributes | Source                                                |
| -------------------------------- | ---------------- | --------- | ---------- | ----------------------------------------------------- |
| `dxos.client.spaces.count`       | observable gauge | `{space}` | —          | `client.spaces.get().length`                          |
| `dxos.client.spaces.ready.count` | observable gauge | `{space}` | —          | spaces whose `state.get() === SpaceState.SPACE_READY` |

Read at collection time in `spacesMetricsProvider`
(`providers/client-observability.ts:165`). The gap between the two is the
"spaces known but not opened" signal.

The same change **removes the `key: data.key` attribute** from the existing
`dxos.client.space.members` / `.objects` / `.epoch` /
`.currentDataMutations` gauges — that attribute is one series per space per
device, i.e. unbounded in the number of spaces users create. Per-space drilldown
is a traces/logs question, not a metrics one.

### EDGE websocket

| Metric                          | Instrument       | Unit          | Attributes                 | Source                                                     |
| ------------------------------- | ---------------- | ------------- | -------------------------- | ---------------------------------------------------------- |
| `dxos.edge.ws.reconnect.count`  | counter (delta)  | `{reconnect}` | `reason`                   | `EdgeClient` reconnect notification (`edge-client.ts:355`) |
| `dxos.edge.ws.connected`        | observable gauge | `1`           | —                          | 1 while the connection is open, else 0                     |
| `dxos.edge.ws.connect.duration` | histogram        | `s`           | `outcome=success\|failure` | dial start → open / failure                                |

`reason` must be a **bounded** enum derived from the close code / error class
(`normal`, `going_away`, `abnormal`, `network`, `auth`, `identity_changed`,
`other`) — never a raw error message. Emitted via `trace.metrics` from
`packages/core/mesh/edge-client/src/edge-client.ts`.

`dxos.edge.ws.connected` as a gauge lets a single SigNoz panel show fleet
connectivity (`avg` across series = fraction of clients online), which a counter
cannot.

Suggested buckets for `connect.duration`: `[0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60]`.

### Documents

| Metric                               | Instrument       | Unit         | Attributes               | Source                                                    |
| ------------------------------------ | ---------------- | ------------ | ------------------------ | --------------------------------------------------------- |
| `dxos.echo.documents.count`          | observable gauge | `{document}` | `location=local\|remote` | `SyncSummary.localDocumentCount` / `.remoteDocumentCount` |
| `dxos.echo.documents.unsynced.count` | observable gauge | `{document}` | —                        | `SyncSummary.unsyncedDocumentCount`                       |

Folded across spaces by `SyncStateTracker` (`providers/sync-state.ts`) from the same
`db.subscribeToSyncState` stream the sync instruments use, so both read one source.
`localDocumentCount` is the "documents loaded" number.

> A _count of load events_ (as opposed to a resident count) would need a counter
> at the repo `find`/load boundary in `@dxos/echo-host`. Deliberately out of scope
> — the resident gauge answers the operational question and the load boundary is a
> much deeper change.

### Sync (the interesting one)

Both instruments are needed; neither alone answers the question.

**One backlog definition, `pendingWorkCount`.** Every instrument, transition, alert and
test in this section reads
`unsyncedDocumentCount + blocksToPull + blocksToPush` — implemented as
`pendingWorkCount` in `providers/sync-state.ts`. Using `unsyncedDocumentCount` for some
and total pending for others would leave a feed-only backlog able to stall
`stalled.duration` while the alert condition read false. `unsyncedDocumentCount` alone
survives only in the `dxos.echo.documents.*` gauges, which are document counts by
definition.

| Metric                            | Instrument       | Unit | Attributes | Source                                                    |
| --------------------------------- | ---------------- | ---- | ---------- | --------------------------------------------------------- |
| `dxos.echo.sync.episode.duration` | histogram        | `s`  | —          | recorded on the `pending > 0` → `pending == 0` transition |
| `dxos.echo.sync.stalled.duration` | observable gauge | `s`  | —          | `now − lastProgressAt` while pending; `0` when caught up  |

**`episode.duration`** — "the longest stretch of time it takes a client to sync".
A _sync episode_ opens when `pendingWorkCount` goes from 0 to non-zero and closes
when it returns to 0; the histogram records the episode's
wall-clock duration. Because OTel exports explicit-bucket histograms, SigNoz merges
buckets across every client before computing the statistic — so `max` gives the
worst episode in the fleet and `p99` the tail, and neither can be obtained from a
client-computed percentile (percentiles are not mergeable; bucket counts are).

**`stalled.duration`** — "the time the client has been unsynced without progress".
This is the stuck-detector, and it is why the histogram is not sufficient: an
episode that _never closes_ never records a histogram sample, so a permanently
stuck client is invisible in `episode.duration` by construction. The gauge is read
at collection time and reports the age of the last observed decrease in
`pendingWorkCount`. **`> 600` alone is the alert condition** — the gauge is 0 whenever
the client is caught up, so a second `documents.unsynced.count > 0` conjunct is both
redundant and wrong: it would suppress the alert for a feed-only backlog.

Progress is defined as a **decrease in `pendingWorkCount`**, not any state
emission — otherwise a client that keeps re-reporting the same backlog looks
healthy. Note that a client concurrently _creating_ documents raises the count, so
the definition tracks the low-water mark within the episode rather than the raw
value.

**First-sample policy (startup and reload).** An episode opens on a
`0 → non-zero` transition, but a provider that starts — or a tab that reloads —
with `pendingWorkCount` already non-zero never sees that transition. Without
a rule, the in-flight episode is invisible to both instruments. The rule:

- On the **first observation** with `pending > 0`, open an episode with
  `openedAt = lastProgressAt = now`. Both are lower bounds: the backlog may have
  existed for hours before the process started.
- `stalled.duration` therefore starts from 0 at startup and becomes meaningful
  after one collection interval. It never returns "unknown" — a stuck client is
  visible within a minute of boot either way.
- A truncated episode **is** recorded to the histogram when it closes, accepting
  that it under-reports duration. The alternative — an `origin=observed|truncated`
  attribute — doubles the histogram's series count (see
  [Cardinality budget](#cardinality-budget), where histograms already dominate)
  to fix a bias the `stalled.duration` gauge already covers. Document the bias
  instead of paying for it.
- Episode state is **not persisted across reloads**. Persisting it would need
  storage plus a clock-skew story, and the gauge makes a genuinely stuck client
  visible regardless. Explicitly out of scope.

Suggested buckets for `episode.duration`:
`[1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]`.

Source of truth is `db.subscribeToSyncState(cb, options)`
(`packages/core/echo/echo-client/src/proxy-db/database.ts:778`), **not** the
automerge-only `subscribeToAutomergeSyncState` path `useSyncState` uses. Since PR
PR #12561 landed it already selects the EDGE peer and owns its own no-change poll
backoff (2s, doubling to a 15s ceiling, snapping back the moment the backlog
moves), so a `DataProvider` consuming it needs no timer of its own — which is
what the earlier "must not own a poll" constraint was waiting for.

`Database.SyncState` also covers **feed blocks** (`blocksToPull`, `blocksToPush`,
`totalBlocks`) alongside documents. An episode is therefore defined over total
pending work, `unsyncedDocumentCount + blocksToPull + blocksToPush`, matching how
`toSpaceUpdate` (`packages/plugins/plugin-client/src/progress/space-sync-progress.ts`)
already decides a space is caught up. A client with a stalled feed backlog is
stuck whether or not its documents converged, so scoping the episode to documents
would miss it. The `dxos.echo.documents.*` gauges stay document-only.

### Memory

Partly instrumented already, but the existing gauges are unusable in practice:
they are sync `gauge()` calls on a 10-minute timer against a 60s export interval
(P4), and they carry no unit. This project fixes them and closes the coverage gap.

| Metric                                   | Instrument       | Unit | Attributes                                             | Source                                         |
| ---------------------------------------- | ---------------- | ---- | ------------------------------------------------------ | ---------------------------------------------- |
| `dxos.client.runtime.heapUsed`           | observable gauge | `By` | —                                                      | `performance.memory.usedJSHeapSize`            |
| `dxos.client.runtime.heapTotal`          | observable gauge | `By` | —                                                      | `performance.memory.totalJSHeapSize`           |
| `dxos.client.runtime.heapSizeLimit`      | observable gauge | `By` | —                                                      | `performance.memory.jsHeapSizeLimit`           |
| `dxos.client.services.runtime.heapUsed`  | observable gauge | `By` | —                                                      | `SystemService.getPlatform().memory.heapUsed`  |
| `dxos.client.services.runtime.heapTotal` | observable gauge | `By` | —                                                      | same                                           |
| `dxos.client.services.runtime.rss`       | observable gauge | `By` | —                                                      | same                                           |
| `dxos.client.runtime.memory.bytes`       | observable gauge | `By` | `scope=window\|shared-worker\|dedicated-worker\|other` | `performance.measureUserAgentSpecificMemory()` |

Names of the first six are kept as-is (camelCase, no unit suffix) so existing
SigNoz history is not orphaned — they only gain a declared unit and move to
`observe()`. All are already produced by `runtimeMetricsProvider`
(`providers/client-observability.ts:119`).

The coverage gap: `performance.memory` is **main-thread only and Chromium-only**,
and the `SystemService` reading is whichever realm hosts client-services. Composer
runs a shared worker plus dedicated workers, so the largest consumers are
currently unmeasured. `performance.measureUserAgentSpecificMemory()` reports
cross-realm usage including workers, which is why it gets its own metric rather
than being folded into the existing names. It requires cross-origin isolation and
resolves slowly (it waits for a GC), so: feature-detect, never assume it exists,
and read it on its own cadence rather than inside the collection callback.

The operationally valuable derived signal is `heapUsed / heapSizeLimit` — a client
above ~0.9 is about to be OOM-killed by the browser. That ratio is computed in
SigNoz from the two gauges, not exported as a third metric.

This overlaps the existing **`memory-usage`** project (registry entry, owner jdw),
which established the 300-400MB resting target and a local `scripts/memory/soak.mjs`
harness. That project measures memory on one machine; this one makes the same
number observable across the fleet, so the target becomes verifiable in production.
Coordinate on names before landing.

## Cardinality budget

SigNoz does no write-time sampling. There is no Cloudflare-Analytics-Engine-style
`_sample_interval` weighting: cost scales as `unique_series × datapoints_per_series`,
a unique series costs a row in `time_series_v4` **plus** a row per datapoint in
`samples_v4`, and Gorilla compression shrinks values, not series counts. So label
choice is the entire cost lever.

Every metric inherits the extension's global tags (`ctx.tag`, `did`, `deviceKey`,
`appPlatform`, `osPlatform`) plus resource attributes. The rule:

- **Keep `deviceKey`** — one series per device is the _point_: it is what lets a panel
  aggregate across clients at all, rather than reading one blended number.
- **Keep `did`** — bounded per user, needed to roll devices up to users.
- **Drop `session.id`** (P2) — unbounded, grows forever with page reloads.
- **Never add** `spaceId`, `objectId`, `peerId`, or a raw error string as a metric
  attribute.

### Budget

Inclusion set: the 16 instruments in the tables above, plus the 4 existing
`dxos.client.space.*` gauges this project modifies. `dxos.client.network.*` and the
extension's own internals are excluded — they are untouched here.

| Group                               | Instruments                           | Series / device |
| ----------------------------------- | ------------------------------------- | --------------- |
| Spaces                              | 2 gauges                              | 2               |
| Per-space (existing, `key` removed) | 4 gauges                              | 4               |
| Documents                           | 2 gauges (one × 2 `location`)         | 3               |
| EDGE non-histogram                  | 1 counter × 7 `reason`, 1 gauge       | 8               |
| Memory                              | 6 gauges + 1 gauge × 4 `scope`        | 10              |
| Sync `stalled.duration`             | 1 gauge                               | 1               |
| **Subtotal, non-histogram**         | **18**                                | **28**          |
| `edge.ws.connect.duration`          | histogram, 9 boundaries × 2 `outcome` | 24              |
| `sync.episode.duration`             | histogram, 10 boundaries              | 13              |
| **Total**                           | **20**                                | **65**          |

**Histograms dominate — 37 of 65 series.** An explicit-bucket histogram is not one
series: SigNoz stores it as one `_bucket` series per boundary plus one for `+Inf`,
along with `_count` and `_sum` — so `boundaries + 3` series per attribute
combination. `connect.duration` is therefore `(9 + 3) × 2 outcomes = 24`, more than
every gauge in the Spaces, Documents, and EDGE groups combined, and
`episode.duration` is `10 + 3 = 13`. Two consequences:

- The "≤2 attribute values" instinct is the wrong lever on a histogram. Adding one
  binary attribute to a 10-boundary histogram costs 13 series; adding one to a gauge
  costs 1.
- **If the budget needs cutting, cut boundaries before labels.** Reducing
  `connect.duration` from 9 boundaries to `[0.5, 2, 10, 60]` takes it from 24 series
  to 14, saving 10 on its own.

At 65 series per device the fleet cost is linear in devices — 10k active devices is
~650k series, before the `time_series_v4` row per series and one `samples_v4` row
per series per 60s export. Phase 5 validates this against the live instance rather
than trusting the arithmetic.

## Verification

- Unit-testable: the sync episode/stall state machine is pure given a sequence of
  `(timestamp, pendingWorkCount)` — test it directly, no mocks (see the repo's
  no-mock-tests rule).
- `RemoteMetrics.observe` fan-out and cleanup: pure unit test in
  `packages/common/tracing`.
- Exported-payload test for P2: `session.id` absent from the metrics payload,
  present on traces and logs.
- Sync first-sample policy: unit-test startup and reload with a non-zero backlog,
  alongside the ordinary transition cases.
- End-to-end: run Composer against a local OTLP endpoint and confirm the series
  land, then `signoz_check_metric_cardinality` on the `dxos.*` metrics to confirm
  the budget above holds in practice. **Await `observability.flush()` before
  asserting** — the export interval is 60s, so a short run otherwise reports false
  missing series. `test/e2e/tracing-invitation.test.ts:160` already does this for
  traces; confirm the same call drains the metric reader.

## Open questions

1. Which SigNoz environment is the dashboard built against (`DX_ENVIRONMENT`
   values in play)? The `signoz` MCP server is configured but unauthenticated, so
   nothing has been verified against a live instance yet.
2. Should feed blocks get their own gauge (`dxos.echo.feed.blocks.unsynced.count`)?
   The episode instruments already count them, but a separate gauge would be needed
   to tell a document-backlog stall from a feed-block stall on the dashboard. Costs
   1 series; deferred rather than silently changing the reconciled budget.
3. Should `did` be dropped in favour of a rotatable client-side identifier? The
   existing `identityProvider` TODO in `client-observability.ts:22-25` already
   flags this for privacy reasons; it would also halve the identity label set.
