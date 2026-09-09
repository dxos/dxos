# Unified observability across Composer and EDGE

## Goal

One `Observability` facade and one set of extension contracts, used by the browser (Composer), node
(`dx`), and workerd (EDGE workers and the plugins operation-service runs). Each host keeps the
transport it already has; what is shared is everything above the transport: the contracts, the
span processors, the AI capture policy, and the PostHog event mapping.

## What each side has today

|                         | Composer / dx                                                                  | EDGE                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Facade                  | `Observability` + Otel and PostHog extensions                                  | none                                                                                  |
| Traces                  | own `WebTracerProvider` / `NodeTracerProvider`, OTLP to SigNoz via `/api/otel` | `otel-cf-workers` provider per invocation, diagnostics channel, tail-logger to SigNoz |
| Metrics                 | own `MeterProvider`                                                            | `otel-cf-workers` metrics, same channel                                               |
| Logs                    | OTLP logs, `ctx_` flattening                                                   | console + tail-logger custom SigNoz JSON, `ctx.` flattening                           |
| Product events / errors | PostHog (posthog-js, posthog-node)                                             | none                                                                                  |
| AI analytics            | `AiSpanProcessor` on the provider, PostHog LLM analytics, content policy       | none; `gen_ai` content attributes exported unstripped                                 |
| Opt-in                  | per-install local storage                                                      | not applicable                                                                        |

## Decisions

**Do not port the transports.** `otel-cf-workers` owns the provider and export on workerd; the
tail worker is the single egress. Two providers would fight over the global and batch timers do
not fire outside a request.

**tail-logger is the egress for every signal on EDGE.** Spans and metrics already go out that way.
Product events, errors, AI analytics and MCP events join them: workers publish records on a
diagnostics channel, tail-logger posts them to PostHog with a server-side key. Secrets stay in one
worker and batching comes for free.

**Shared processors attach to whichever provider exists.** `FanoutSpanProcessor` is a set of
processors consulted at span end. On Composer it sits in our own provider; on EDGE it goes into
the `otel-cf-workers` `spanProcessors` config. `attachAiCapture` registers through it on both, so
the AI capture policy runs identically without owning a provider.

**AI content stripping runs in front of every exporter.** `AiContentStrippingSpanProcessor` wraps
the diagnostics-channel exporter on EDGE exactly as it wraps the OTLP exporter in Composer.

**Relay extension, both ends.** `ObservabilityExtension.Relay` implements the `events`, `errors`,
`ai` and `mcp` kinds by handing a typed envelope to a `publish` function, and `Relay.replay` plays
an envelope back onto a facade. Producers (edge, other workers, plugins in operation-service)
publish on `channel('dxos:observability')`; tail-logger runs its own `Observability` with the real
exporters (the PostHog node transport, which ships a workerd build) and replays every envelope
onto it. One API on every worker, exporter configuration in one place.

**Attribution is per record.** Distinct ids are identity DIDs. EDGE knows the caller's DID from the
authenticated router context, so the producer's Relay resolves it per record and the envelope
carries it; on replay the record's DID is ambient for its facade calls and the PostHog transport's
resolver reads it. Work no user claims (background jobs) is attributed to the service with PostHog
person profiles off, so a service never becomes a person.

**The telemetry opt-in lives in the settings space, through the app's settings sync.** dxos#12609
binds every plugin's settings atom to the `AppSettings` object in the settings space, so the
observability `enabled` field replicates with no plugin-specific code. The plugin follows its
atom into the backends and the local mirror (the value the next boot reads before the atom
exists). EDGE reads `AppSettings.shared["org.dxos.plugin.observability"].enabled` from the same
space.

**AI content capture is not a separate consent.** Content goes out when telemetry is on and the
space is one EDGE already sees in plaintext. A space EDGE can read is one EDGE may observe, under
the same opt-in. `contentCaptureAllowed(spaceId)` is where an E2E space will be excluded once
one exists; today every space replicates through EDGE in plaintext and the predicate returns true
for all of them, so metadata-only for E2E is the planned boundary, not an enforced one.

**EDGE gates AI capture on the user's opt-in, read from the settings space.** The `Observability`
on a worker is per isolate and serves every user, so the gate is per invocation, not per instance.
Until EDGE resolves the invoking identity's settings space (via `DataService.getSpaceTags` over
the identity's spaces) the fanout stays out of the `otel-cf-workers` config: no AI records leave
EDGE, and content stripping still runs in front of the trace exporter.

## Sequencing

pkg.pr.new publishes only on push to `main`, so the dxos PR lands first and the EDGE PR pins the
catalog to its merge commit.

1. dxos: `@dxos/observability` bundles on workerd, Relay extension, `SpanProcessors` subpath;
   plugin-observability settings reactor, workerd `Observability` module, delete the workerd
   handler stub. Stacked on dxos#12609, which carries the settings sync itself.
2. edge: catalog bump; `otel-instrument.ts` adds content stripping; `edge-platform` builds the
   per-isolate `Observability` from Relay; tail-logger consumes `dxos:observability` into
   posthog-node; operation-service passes the observability to the plugin.
3. edge: per-invocation opt-in read from the settings space, then the fanout joins the
   `otel-cf-workers` config and AI analytics flow from EDGE.
4. Later: shared log flattening and severity mapping; OTLP logs from tail-logger.
