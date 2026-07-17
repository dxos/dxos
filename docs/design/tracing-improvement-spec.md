# Distributed Tracing Improvement Spec — Composer ⇄ EDGE

Status: draft v2 (2026-07-06) — evidence refreshed after the subduction migration; DX-T2/T3/G1
implemented on this branch, EG items re-verified against edge main.
Scope: `dxos` repo (client / Composer) and `edge` repo (Cloudflare Workers backend).
Evidence: code inspection of both repos + SigNoz production data (24h windows, 2026-07-01/02 and
2026-07-05/06).

**Evidence refresh (2026-07-06, post-subduction-migration):**

| Original symptom    | Current state                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session mega-traces | 50× better: largest trace 1,910 spans (was 101,731) — subduction stopped connection-scoped parent accretion. Residual tail from `syncPeer`-on-lifecycle addressed by DX-T2.2 on this branch.                    |
| WS propagation      | Flipped: **99.85%** of `webSocketMessage` spans parentless (was 92%) — subduction send path had no ctx plumbing. Handshake propagation added by DX-T2 on this branch; steady-state stays context-free per SC-1. |
| Minified names      | Unchanged (`K._fetchTranscription`, `gw.syncPeer`, `Yk.connectToSpace`) — DX-T1 still open.                                                                                                                     |
| AI dangling parents | Still present (27/day) — fixed by DX-T3 on this branch (headers stripped + ctx-driven).                                                                                                                         |
| Silent flow stalls  | New: a guest invitation stall after edge admission emits zero spans — addressed by per-transition instant spans (G1) on this branch.                                                                            |

## 1. Problem statement

Trace context propagation mechanically works across all three transports (HTTP headers,
`message.traceContext` on the edge messenger WS protocol, `request.traceContext` on teleport RPC),
but the resulting telemetry is largely unusable:

| Symptom                               | Measured evidence                                                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session mega-traces                   | One trace (`9c932ede…`) with **101,731 edge + 313 composer spans** over 5+ hours                                                                                                  |
| Missing trace roots                   | Mega-trace roots are client lifecycle spans that only export on `close()` (never, in a browser tab)                                                                               |
| Dangling parents                      | `POST /ai/*` server spans parented on Effect HttpClient fiber spans that are never exported; edge 0.5 head sampling orphans service-binding children                              |
| No propagation on most traffic        | **92%** of `RouterObject.webSocketMessage` spans (389,636 / 422,856 per day) are parentless roots; notarization polling, agent status, registry, WS upgrade send no `traceparent` |
| Key flows have no client spans at all | AI requests, function invocation, agent creation produce zero composer spans — there is nothing to connect regardless of propagation                                              |
| Unreadable client spans               | Production span names are minified (`Lb.syncPeer`, `ST._openConnection`, `q._open`)                                                                                               |
| Span volume misallocated              | ~600k edge spans/day are steady-state sync noise (`relayMessage` 408k, `FeedSpace.init` 320k); high-value user flows are the ones with broken propagation                         |

## 2. Target policy (definition of done for the program)

1. **A trace is one bounded operation** — a user action, one message handled, one sync round, one
   HTTP request. Never a session or a connection.
2. **A span may only parent an exported child if it itself exports promptly.** Long-lived spans
   (lifecycle, connection) correlate via **span links** or attributes, never via parent-child.
3. **Every golden flow (DX-T5) has a client root span at the user-action entry point.**
   Propagation is worthless without a span to propagate.
4. **Sessions and connections are correlated by attributes** (`session.id`, `connection.id`), not by
   trace IDs.
5. **Sampling is parent-based everywhere**; ratio sampling happens only at true roots; errors are
   always kept by tail sampling.
6. **Steady-state replication is measured with metrics; traces are reserved for user-initiated
   flows, errors, and latency outliers.**

## 3. Shared contract (must be agreed before either side ships)

These items change the wire-level or semantic contract between the repos. Land the contract first;
each side can then ship independently.

### SC-1. Trace-boundary semantics for WS messages

- `message.traceContext` (messenger.proto field 21) means: _this message is part of the
  per-operation trace identified by `traceparent`_. Clients MUST NOT populate it with
  connection-scoped or lifecycle span context.
- When `traceContext` is absent, edge creates a root span with a **link** to the connection-level
  trace (current fallback behavior in `router.ts:786-802` becomes the canonical pattern).

### SC-2. Session/connection correlation attributes

- Client sends a stable `sessionId` (already generated as `session.id` resource attribute in
  `@dxos/observability`) with the WS upgrade (auth state / query param, next to the existing
  `clientTag`) and as an HTTP header on `BaseHttpClient._call` requests.
- Edge stamps `ctx.sessionId` (and `ctx.connectionId` for WS) on every span, alongside the existing
  `ctx.identityKey` / `ctx.tag`.
- Acceptance: in SigNoz, `attribute.ctx.sessionId = '<uuid>'` returns all edge spans for one client
  session across many small traces.

### SC-3. Sampling contract

- Client roots decide sampling (composer volume is tiny — sample 100% at the root).
- Edge respects the incoming `sampled` flag (`ParentBasedSampler`); ratio sampling applies only to
  edge-originated roots. Tail sampling continues to force-keep error spans.

---

## 4. DXOS repo workstream

### DX-T1 (P0, M) — Unminify composer span names via mandatory explicit names

- **Problem**: `@trace.span()` derives names from `constructor.name`; esbuild minification produces
  `Lb.syncPeer`, `q._open`.
- **Change**: make the span name an explicit, mandatory option resolved at decoration time —
  `@trace.span({ name: 'EchoEdgeReplicator._openConnection' })` (and the equivalent `methodName`/
  class name inputs on `trace.spanStart` / `@trace.resource`). String literals survive
  minification; names become stable identifiers independent of build tooling and refactors, and
  greppable from a SigNoz span name straight back to the source. Rejected alternative:
  `keepNames: true` — zero call-site churn, but it couples telemetry naming to a global build flag,
  adds bundle size for every class (not just traced ones), and silently regresses if a bundler or
  option changes; explicit names fail loudly (lint) instead.
- **Migration**: update all existing `@trace.span()` / `@trace.resource()` / `spanStart` call
  sites; enforce the option via a `dxos-plugin` lint rule so new decorators without `name` fail CI.
- **Files**: `packages/common/tracing/src/api.ts` (option + decoration-time resolution),
  `tools/eslint-plugin` (rule), all decorated call sites (mechanical sweep).
- **Acceptance**: lint rule active; no exported span names matching `/^[A-Za-z]{1,2}\./` in SigNoz
  after deploy.

### DX-T2 (P0, M) — Stop parenting exported spans on lifecycle/connection spans

- **Problem**: source of the mega-trace and missing roots. (Retargeted 2026-07-06: the active
  sync path is now `EchoEdgeSubductionReplicator` — the old `EchoEdgeReplicator` connection-ctx
  capture is legacy; subduction shipped with NO send-path ctx at all, flipping the failure from
  mega-traces to zero propagation.)
- **Changes**:
  1. **[IMPLEMENTED]** `EchoEdgeSubductionReplicator`
     (`packages/core/echo/echo-host/src/edge/echo-edge-subduction-replicator.ts`): the handshake
     frame carries the `connectToSpace` operation's trace context (`handshakeCtx`); steady-state
     frames are deliberately context-free — edge links them to the connection trace per SC-1.
  2. **[IMPLEMENTED]** `CollectionSynchronizer` (`…/automerge/collection-synchronizer.ts`):
     `syncPeer` manual spans are browser-timeline-only (`showInRemoteTracing: false`) — no longer
     children of the lifecycle span in remote traces.
  3. `@dxos/tracing`: lifecycle spans (`@trace.resource({ lifecycle: true })`) no longer put their
     span context on `this._ctx` for **remote** parenting. Add a `trace.link()`-style mechanism so
     children reference the lifecycle span via OTEL span links instead. Browser-timeline behavior
     is unchanged. (Open — remaining lifecycle-parent producers beyond syncPeer.)
- **Acceptance**: max spans per trace over 24h < 500; no composer-rooted trace spans > 15 minutes;
  edge `webSocketMessage` spans never parent on a client span that started > 60s earlier.

### DX-T3 (P0, S) — Fix the Effect `traceparent` leak on the AI path

- **Problem**: `@effect/ai` HttpClient injects `traceparent` from unexported fiber spans;
  `anthropicAiRequest` (`packages/core/mesh/edge-client/src/edge-http-client.ts:456`) forwards it
  verbatim → dangling parents on every `POST /ai/*` server span.
- **Change (immediate)**: strip `traceparent`/`tracestate` from the forwarded headers in
  `anthropicAiRequest`, and give it a `ctx: Context` first parameter that sets the headers
  deliberately via the same `getTraceHeaders` used by `BaseHttpClient._call` (also resolves the
  existing TODO to merge with `_call`).
- **Change (superseded by DX-T7)**: once Effect spans are exported, remove the stripping.
- **Status**: **[IMPLEMENTED]** — `anthropicAiRequest(ctx, request)` strips inherited
  `traceparent`/`tracestate` and sets headers from `ctx`; the Effect-side caller passes
  `Context.default()` until DX-T7 lands (AI server spans become clean roots).
- **Acceptance**: 0 edge `POST /ai/*` spans with a `parentSpanID` that does not exist in the trace.

### DX-T4 (P1, S) — Make ctx non-optional at the edge-client seam; fix null call sites

- **Change**: `EdgeHttpClient`/`EdgeClient` public methods take a required, non-nullable
  `ctx: Context`. Fix known offenders: `packages/sdk/shell/src/panels/IdentityPanel/useEdgeAgentsHandlers.ts:74`
  (`createAgent(null as any, …)` → `Context.default()` at the UI boundary).
- **Acceptance**: `grep -rn "null as any" packages | grep -i "ctx\|context"` is empty for
  edge-client call sites; typecheck enforces the rest.

### DX-T5 (P0, M) — Client root spans + ctx threading for the golden flows

- **Problem**: the flows most worth debugging either have **no client span at all** (AI requests,
  function invocation, agent creation) or hold span-less contexts at the entry point, so requests
  reach edge without `traceparent` despite working plumbing (notarization ~3k parentless
  roots/day, agent status).
- **Change**: for each golden flow below, create (or verify) a root span at the user-action entry
  point and thread its ctx to the edge-client call. Targeted — these five flows, not a
  codebase-wide ctx audit.

  | #   | Flow                           | Client entry point                                             | Edge side                                  |
  | --- | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------ |
  | G1  | Invitation accept / space join | `InvitationsHandler.acceptInvitation`                          | Router / SpaceStateMachine                 |
  | G2  | Space open + initial sync      | `DataSpace.open` chain (exists today, trace `d9f0036d…` shape) | Router / SubductionReplicator              |
  | G3  | AI chat request                | **missing — must be created** (assistant send path)            | `POST /ai/*` → AI_SERVICE binding          |
  | G4  | Function invocation            | `RemoteFunctionExecutionService.invokeFunction` (ctx exists)   | FunctionsServiceEntrypoint (needs EG-T4.1) |
  | G5  | Notarization round             | `NotarizationPlugin` write path                                | `GET/POST /spaces/:id/notarization`        |

- **Status (G1, partial)**: **[IMPLEMENTED]** per-transition instant spans
  (`InvitationFlow.state.*`, `invitation-state.ts`) parented on the invitation flow span — a
  stalled flow's last transition now marks where it stopped (previously a silent stall emitted
  nothing; observed live on a guest that hung after edge admission).
- **Acceptance**: each of G1–G5 produces exactly one connected composer→edge trace with a present
  root, readable names, and < 500 spans; verified by running each flow against labs and checking
  the SigNoz trace.

### DX-T6 (P2, S) — Harden `trace.spanStart` API

- **Problem**: returning a derived ctx that callers must reassign is a proven footgun.
- **Change**: add `trace.withSpan(opts, (ctx) => …)` callback form; migrate `spanStart` call sites;
  deprecate the raw pair for new code.

### DX-T7 (P2, L, strategic) — Export Effect spans; converge on Effect tracing

- **Change**: wire `@effect/opentelemetry` to the same OTLP pipeline/resource as `OtelTraces` so
  the growing Effect codebase gets ambient, fiber-carried tracing. Declare manual ctx-threading a
  legacy seam mechanism (RPC codec, WS envelope) rather than the propagation strategy; new Effect
  code must not add `ctx: Context` parameters for tracing purposes.
- **Acceptance**: Effect HTTP client spans visible in SigNoz under `composer`, correctly parented;
  a written policy note in `.agents/skills/context-propagation` reflecting the demotion.

---

## 5. EDGE repo workstream

### EG-T1 (P1, S) — Dangling-parent root cause (was: parent-based sampling)

- **Correction (2026-07-06)**: head sampling is **already parent-based** —
  `@dxos/otel-cf-workers`'s `createSampler({ ratio })` wraps the ratio in
  `ParentBasedSampler({ root: ratioSampler })`, so child decisions follow the incoming flag and
  the originally-proposed change is a no-op.
- **Revised problem**: dangling `Service Binding *` parent references therefore have a different
  cause — candidates: tail-event export loss (per-event `fetch` to SigNoz with no retry in
  `tail-logger/main.ts`), spans dropped at workerd tail buffering limits, or producers whose
  traceparent-injecting hop is not instrumented.
- **Change**: measure the dangling-parent rate excluding the AI path (fixed by DX-T3), attribute
  the remainder to one of the candidates, and fix at the source (e.g. batch + retry in the
  tail-logger exporter).
- **Acceptance**: dangling-parent rate < 1% over 7 days.

### EG-T2 (P1, M) — Stamp session/connection attributes (SC-2, edge half)

- **Change**: extend `RouterWebSocketAttachment.executionContext.attributes` and
  `getTraceAttributes` (`packages/sdk/edge-platform/src/tracing.ts:71-85`) to include
  `ctx.sessionId` / `ctx.connectionId` from the upgrade request; add the `sessionId` header to the
  HTTP `instrument()` attribute extraction.
- **Acceptance**: SC-2 acceptance query works.

### EG-T3 (P1, L) — Rebalance span volume: metrics for steady-state sync

- **Problem**: `RouterObject.relayMessage` (408k/day), `FeedSpace.processMessage` (320k/day),
  `FeedSpace.init` (320k/day) are per-message spans answering no per-instance question.
- **Changes**:
  1. Investigate why `FeedSpace.init` fires per message (init-per-message is a smell — either a
     real re-init bug or a mislabeled span).
  2. Replace per-message spans on the hot relay/replication path with counters/histograms
     (Analytics Engine metering already exists) plus **sampled exemplar traces** (e.g. 1% of sync
     rounds, 100% of errors via tail sampler).
- **Acceptance**: edge span volume reduced ≥ 5× (< 120k/day at current traffic) with error
  visibility unchanged (all `hasError = true` spans still exported).

### EG-T4 (P1, M) — Close instrumentation coverage gaps

- **Changes**:
  1. Wrap `FunctionsServiceEntrypoint` in `instrumentEntrypoint(…, 'edge')`
     (`packages/services/functions-service/src/main.ts`) — required by golden flow G4 (DX-T5).
  2. Apply `instrumentDO` (or enforce `withParentTraceContext` at every RPC method) for lazy-loaded
     DOs: `AutomergeReplicator`, `FeedReplicator`, `Indexer2`, etc.
  3. Triage the uninstrumented workers (ai-service internals, compute, sandbox, kms, registry,
     calls, jetstream, blob, rss, discord): instrument the ones on user-facing request paths
     (ai-service, compute, sandbox first); explicitly mark the rest out of scope.
- **Acceptance**: a request entering any instrumented worker via HTTP/service-binding/RPC produces
  a connected trace; documented list of intentionally-uninstrumented workers.

### EG-T5 (P2, S) — Canonicalize the link-based fallback — **[DONE upstream]**

- Verified 2026-07-06 on edge main: `_withWebSocketExecutionContext`'s no-traceContext path
  (root span + `websocket.connection` link) covers `webSocketClose`/`webSocketError` and is
  documented as the canonical steady-state handling. No further change needed.

---

## 6. Sequencing

```
Week 1  (contract)   SC-1..SC-3 agreed; DX-T3, EG-T1 shipped; DX-T1 lint/API landed
Week 2-3             DX-T2 + EG-T5 (trace boundary; land together per SC-1), DX-T1 call-site sweep, DX-T4
Week 3-4             DX-T5 golden flows (one by one, each verified in SigNoz) + EG-T4.1,
                     SC-2 both halves (client send + EG-T2)
Week 4+              EG-T3 (volume rebalance), EG-T4.2-3, DX-T6/DX-T7 (strategic)
```

Rollback safety: every item is additive or subtractive telemetry-only; none change product
behavior. DX-T2 and EG-T5 are the only coupled pair — edge's fallback already handles
traceContext-less messages, so the client can ship first without breakage.

## 7. Program-level acceptance (SigNoz queries, 7 days post-rollout)

1. Each golden flow G1–G5 (DX-T5) produces one connected composer→edge trace: root present, names
   readable, < 500 spans, client and server spans linked.
2. p99 spans-per-trace < 500; no trace > 15 min wall clock.
3. Dangling-parent rate (parent referenced but absent, excluding tail-sampled-out errors) < 1%.
4. All composer span names human-readable.
5. `ctx.sessionId` present on 100% of edge WS-path spans; session drill-down works via attribute
   query.
6. Edge span volume ≤ 20% of current baseline; error-span export rate unchanged.
