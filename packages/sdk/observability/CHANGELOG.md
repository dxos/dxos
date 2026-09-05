# @dxos/observability

## 0.12.0

### Minor Changes

- 4560ba3: Metrics can now be observed rather than pushed. `trace.metrics.observe(name, callback, data)` and `observability.metrics.observe(...)` register a callback that is read once per export interval and return a cleanup function, which is the correct instrument for any "current value" metric — a pushed gauge only lands in the export windows its producer happens to tick in, so a producer on a slower cadence than the exporter leaves the series full of gaps. Observations registered before a collector attaches are replayed to it, so SDK code can register at startup, and `RemoteMetrics.unregisterProcessor` detaches a collector on shutdown so a closed one neither keeps receiving samples nor double-reports alongside its replacement.

  Metric instruments now carry `unit` and `description`, supplied via the new fourth `meta` argument on `gauge`/`increment`/`distribution`/`observe`.

  New client metrics: `dxos.client.spaces.count` / `.ready.count`, `dxos.echo.documents.count{location}` and `dxos.echo.documents.unsynced.count`, and `dxos.client.runtime.memory.bytes{scope}` — the last reporting cross-realm usage via `measureUserAgentSpecificMemory`, which is the only way to see shared and dedicated worker heaps. The existing heap gauges keep their names but are now observed with declared `By` units, and the `dxos.client.space.*` gauges report device-wide totals instead of carrying a per-space `key` attribute that cost one series per space.

  Three fixes to the OTLP metrics exporter: it now requests **delta** temporality, so a client reload is no longer read downstream as a counter reset; the metrics resource no longer carries `session.id`, which minted a new time series on every page load; and instruments are cached instead of re-created on every sample.

  Adds sync-timing metrics: `dxos.echo.sync.episode.duration` (how long a client takes to reach a synced state) and `dxos.echo.sync.stalled.duration` (how long it has made no progress). Both are needed — a client that never finishes syncing records no duration at all, so the stall gauge is what makes it visible.

  Adds runtime responsiveness metrics: `dxos.client.runtime.eventLoop.lag` reports the peak time a timer fired behind schedule per export window (per realm, so the tab and the workers are separable), and `@dxos/worker-framework`'s `RpcTiming` now publishes `dxos.rpc.queueWait.duration` and `dxos.rpc.service.duration`. Queue wait is the cross-thread signal — time a message spent waiting for the receiving thread rather than time spent working — which makes a blocked worker visible without instrumenting it.

  Breaking for anyone implementing the observability extension API directly: the `metrics` kind now requires an `observe` method.

- 5ae704b: `@dxos/observability` exposes one entrypoint per namespace (`/Observability`, `/ObservabilityExtension`, `/ObservabilityProvider`, `/ObservabilityClientProvider`, `/AiObservability`, `/OtelLogSink`, `/OtelMetricsSink`, `/OtelSpanSink`), and the `dxos-subpath-imports` lint rewrites barrel imports onto them, so a consumer no longer pulls the whole package into its eager graph. The barrel keeps exporting the first four. The AI sink and the `Otel*Sink` trio are standalone entrypoints off the barrel, since only a lazily activated capability and the log-writer worker use them.

  Breaking: the providers that reach `@dxos/client` moved from `ObservabilityProvider.Client` to `ObservabilityClientProvider.Client`, and `eventLoopLagProvider` to `ObservabilityProvider.EventLoopLag`.

  `dxos-subpath-exports` now resolves a `dist-runtime` package's entrypoints from `types` when the toolbox has stripped `source`, so the barrel-versus-subpath check runs for those packages too; it caught `@dxos/sql-sqlite` missing `SqlExport` from its barrel.

- 242faca: Add `OtelLogSink` (`@dxos/observability/OtelLogSink`) and an `observabilityWorker` option on the Otel extension: OTLP log export can now run in the observability worker, on its own event loop, so a realm blocked by a long synchronous task keeps exporting the lines it logs in near-real-time. `OtelLogs` gains an `emit()` seam and stamps records with the producing log call's timestamp.
- 8d62799: Metric export can now run in the observability worker: `OtelMetricsSink` (`@dxos/observability/OtelMetricsSink`) hosts the `MeterProvider` and export timer, fed by instrument calls the producing realm forwards synchronously (`RemoteMetricsForwarder`, active when the Otel extension's `observabilityWorker` option is set). A realm blocked by a long synchronous task keeps landing datapoints. Observable gauges are sampled producer-side on a timer and forwarded as plain gauges.
- 6eaddf3: Span export can now run in the observability worker: `OtelSpanSink` (`@dxos/observability/OtelSpanSink`) hosts the batch processor and OTLP exporter, fed by ended spans the realm's tracer provider forwards via `PortSpanProcessor` (active when the Otel extension's `observabilityWorker` option is set). Sampling, span IDs, and context propagation stay in the producing realm; only batching and export move out, so spans ended by code inside a long synchronous task export while the realm is still blocked.
- a78a66d: AI model calls, tool calls, and conversation turns are reported to LLM analytics. `@dxos/observability` gains an `ai` extension kind: `AiObservability` reads the finished `gen_ai.*` spans, applies the capture policy (nothing while telemetry is off; the prompt, the response, and the tool names only for a space its `allowContent` predicate accepts), and reports `Inference`, `Turn`, and `ToolCall` records. The PostHog extension maps them onto `$ai_generation`, `$ai_trace`, and `$ai_span`, with prompt-cache token counts and the streaming flag. Conversation content never reaches a trace backend: every OTLP export strips it from the span, and the span itself stays in the trace.

  Traces are complete and attributable. The compute runtime opens a span around every handler dispatch, spawn, hydrate, operation invoke, trigger invocation, and layer materialization, and an alarm or child event runs with the process's own context rather than under the span that scheduled it, so a model call fired from an alarm exports under its turn. Every span carries the identity as `did` in the tab and in the dedicated worker, and `spaceId` wherever the work is scoped to one space: ECHO, the feed store, the index engine, and the process runtime. Logs carry the active trace and span ids in the browser and in node, and a warning or error log promotes its trace through the tail sampler.

  Breaking: `ProcessContext.setAlarm` returns an `Effect` and must be yielded. `SpanAttributes` in `@dxos/effect` holds the shared attribute keys, `Database.withSpaceId` stamps the current database's space on the spans below it, and `EffectEx.contextWithoutParentSpan<R>()` captures a context for work dispatched later.

- 059900a: Observability now works outside the browser. Three internal specifiers — storage, OTel traces, and the PostHog transport — resolve per condition through package `imports`, so a node host gets the node half where it used to inline the browser stub, and the browser keeps a graph with no `posthog-node` in it. PostHog gains a `posthog-node` transport, and MCP server sessions and tool calls are a new `mcp` extension kind. Opting out now stops OTel: the exporters were constructed before the consent check, so a metric reader kept exporting on its own schedule whatever the user had chosen. `isObservabilityDisabled` reports disabled when the state cannot be read, and the first-run notice creates the profile directory it writes its marker into.

  `dx` sends usage and performance data, matching what Composer collects: an event per command, the operations plugins map to events, errors, and MCP `initialize` and `tools/call` when `dx mcp serve` is running. Events are attributed to the identity DID once there is one, and to a per-installation id before that, aliased across the transition so one person is not two. Only a released binary reports: it sends OTel through the deployment's ingestion proxy, which holds the credential server-side, and to whichever PostHog project was injected when it was built. A source checkout reports nothing unless `DX_POSTHOG_API_KEY` or `DX_OTEL_ENDPOINT` says where. Manage it with `dx telemetry [status|enable|disable]`, or `DX_DISABLE_OBSERVABILITY=true`.

### Patch Changes

- 5dfa21e: OTel export fans out to a list of destinations instead of a single endpoint, so a second collector
  can be trialled without moving the first. Each destination gets its own batch processor (traces,
  logs) or metric reader (metrics), so a slow or failing backend only stalls its own queue. Delta
  counters are not split across readers — the temporal processor holds one unreported accumulation per
  collector — but observable-gauge callbacks now run once per destination, so they must stay
  side-effect free.

  The list is resolved in the producing realm and shipped in the log-writer worker's init messages, so
  the worker sinks fan out too. A span still crosses the port once, whatever the destination count.

  `PostHog.otelDestination(config)` builds a destination from the existing `DX_POSTHOG_API_HOST` and
  `DX_POSTHOG_API_KEY` — PostHog serves OTLP under `/i` of the same host it ingests product analytics
  on, and authenticates with the public `phc_` project token, so no server-side proxy is needed to
  hold a secret and no new variable is needed to address it. Composer sends to it alongside SigNoz on
  every deployed environment.

- 5cefa04: Every PostHog event now carries the SDK version as `sdkVersion`, alongside the existing app-level `release` property.
- Updated dependencies [86d1482]
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [0fe00c5]
- Updated dependencies [069e8ed]
- Updated dependencies [73daef4]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [b4c7782]
- Updated dependencies [4e417e9]
- Updated dependencies [ea11703]
- Updated dependencies [c01fef6]
- Updated dependencies [881f900]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [23d2d8c]
- Updated dependencies [6c6987e]
- Updated dependencies [3e02201]
- Updated dependencies [ed43a8d]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [e56276b]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [48ea128]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [a74e9b0]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [617b125]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [4663f24]
- Updated dependencies [2513a52]
- Updated dependencies [2896a58]
- Updated dependencies [b125655]
- Updated dependencies [9e91762]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [f8bfba0]
- Updated dependencies [ea11703]
- Updated dependencies [0280a6a]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [5d816a6]
- Updated dependencies [85e6347]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/client@0.12.0
  - @dxos/echo@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/config@0.12.0
  - @dxos/log-store-idb@0.12.0
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/client@0.11.1
- @dxos/client-services@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/log-store-idb@0.11.1
- @dxos/network-manager@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/tracing@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- 41d1e4a: Send `$survey_completed` with captured user feedback so PostHog survey destinations trigger, and serialize errors logged as context to OTel instead of dropping them.
- Updated dependencies [aea1e6e]
- Updated dependencies [eec72c5]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [856c4f0]
- Updated dependencies [410a019]
- Updated dependencies [f6a01e3]
- Updated dependencies [c727a43]
- Updated dependencies [d547045]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [c727a43]
- Updated dependencies [da66270]
- Updated dependencies [41141d8]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-services@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/log@0.11.0
  - @dxos/config@0.11.0
  - @dxos/tracing@0.11.0
  - @dxos/network-manager@0.11.0
  - @dxos/context@0.11.0
  - @dxos/log-store-idb@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
