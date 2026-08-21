# SDK Metrics — Design

## Goal

Instrument the DXOS SDK with a small, fixed set of OTel metrics that answer four
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
read at collection time. **Every gauge in this project uses `observe`, not
`gauge`.** Existing `dxos.client.network.*` / `dxos.client.runtime.*` gauges are
migrated opportunistically, not as a blocker.

### P5 — Honor `unit` and `description`

`MetricData.unit` exists and is dropped on the floor by `OtelMetrics`. Pass it
through, and add `description`. Also register explicit histogram bucket boundaries
via a `View` — the OTel default boundaries top out at 10,000 and are shaped for
milliseconds, which is wrong for the seconds-to-minutes durations below.

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

| Metric                               | Instrument       | Unit         | Attributes               | Source                                                          |
| ------------------------------------ | ---------------- | ------------ | ------------------------ | --------------------------------------------------------------- |
| `dxos.echo.documents.count`          | observable gauge | `{document}` | `location=local\|remote` | `getSyncSummary()` `localDocumentCount` / `remoteDocumentCount` |
| `dxos.echo.documents.unsynced.count` | observable gauge | `{document}` | —                        | `getSyncSummary().unsyncedDocumentCount`                        |

`getSyncSummary` (`packages/sdk/client/src/echo/util.ts:23`) already folds
per-space `SpaceSyncState.PeerState` into a single fleet-comparable summary, so
this is a read of data the client already maintains. `localDocumentCount` is the
"documents loaded" number.

> A _count of load events_ (as opposed to a resident count) would need a counter
> at the repo `find`/load boundary in `@dxos/echo-host`. Deliberately out of scope
> — the resident gauge answers the operational question and the load boundary is a
> much deeper change.

### Sync (the interesting one)

Both instruments are needed; neither alone answers the question.

| Metric                            | Instrument       | Unit | Attributes | Source                                                      |
| --------------------------------- | ---------------- | ---- | ---------- | ----------------------------------------------------------- |
| `dxos.echo.sync.episode.duration` | histogram        | `s`  | —          | recorded on the `unsynced > 0` → `unsynced == 0` transition |
| `dxos.echo.sync.stalled.duration` | observable gauge | `s`  | —          | `now − lastProgressAt` while unsynced; `0` when synced      |

**`episode.duration`** — "the longest stretch of time it takes a client to sync".
A _sync episode_ opens when `getSyncSummary().unsyncedDocumentCount` goes from 0
to non-zero and closes when it returns to 0; the histogram records the episode's
wall-clock duration. Because OTel exports explicit-bucket histograms, SigNoz merges
buckets across every client before computing the statistic — so `max` gives the
worst episode in the fleet and `p99` the tail, and neither can be obtained from a
client-computed percentile (percentiles are not mergeable; bucket counts are).

**`stalled.duration`** — "the time the client has been unsynced without progress".
This is the stuck-detector, and it is why the histogram is not sufficient: an
episode that _never closes_ never records a histogram sample, so a permanently
stuck client is invisible in `episode.duration` by construction. The gauge is read
at collection time and reports the age of the last observed decrease in
`unsyncedDocumentCount`. `> 600` while `documents.unsynced.count > 0` is the
alertable condition.

Progress is defined as a **decrease in `unsyncedDocumentCount`**, not any state
emission — otherwise a client that keeps re-reporting the same backlog looks
healthy. Note that a client concurrently _creating_ documents raises the count, so
the definition tracks the low-water mark within the episode rather than the raw
value.

Suggested buckets for `episode.duration`:
`[1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600]`.

Source of truth is a non-React aggregator over
`space.internal.db.subscribeToAutomergeSyncState` filtered to the EDGE peer, the
same shape as `useSyncState` (`packages/sdk/react-client/src/echo/useSyncState.ts`)
but living in a `DataProvider`. The 1Hz polling caveat in
`SpaceProxy._syncToEdge` (`space-proxy.ts:770`, "still need polling, otherwise
this gets stuck") applies here too — the subscription alone is not a reliable
edge trigger.

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

- **Keep `deviceKey`** — one series per device is the _point_, since "p90 client
  holds N spaces" requires one series per client to aggregate across.
- **Keep `did`** — bounded per user, needed to roll devices up to users.
- **Drop `session.id`** (P2) — unbounded, grows forever with page reloads.
- **Never add** `spaceId`, `objectId`, `peerId`, or a raw error string as a metric
  attribute.

Budget: 18 instruments, ≤2 attribute values each except the 4-valued
`memory.bytes` scope ≈ **24 series per device**.

## Verification

- Unit-testable: the sync episode/stall state machine is pure given a sequence of
  `(timestamp, unsyncedDocumentCount)` — test it directly, no mocks (see the
  repo's no-mock-tests rule).
- `RemoteMetrics.observe` fan-out and cleanup: pure unit test in
  `packages/common/tracing`.
- End-to-end: run Composer against a local OTLP endpoint and confirm the series
  land, then `signoz_check_metric_cardinality` on the `dxos.*` metrics to confirm
  the budget above holds in practice.

## Open questions

1. Which SigNoz environment is the dashboard built against (`DX_ENVIRONMENT`
   values in play)? The `signoz` MCP server is configured but unauthenticated, so
   nothing has been verified against a live instance yet.
2. Should `did` be dropped in favour of a rotatable client-side identifier? The
   existing `identityProvider` TODO in `client-observability.ts:22-25` already
   flags this for privacy reasons; it would also halve the identity label set.
