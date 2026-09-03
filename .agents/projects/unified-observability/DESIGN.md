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

**Relay extension.** `ObservabilityExtension.Relay` implements the `events`, `errors`, `ai` and
`mcp` kinds by handing a typed envelope to a `publish` function. It imports nothing
platform-specific; EDGE supplies `channel('dxos:observability').publish` and tail-logger decodes
the same envelope type.

**The telemetry opt-in lives in the settings space.** One annotation on the settings space
properties, `enabled`, replicating across the user's devices. Local storage keeps a mirror so the
choice applies before the space is readable at boot, and the first device with the space migrates
its local value in.

**AI content capture is not a separate consent.** Content goes out when telemetry is on and the
space is one EDGE already sees in plaintext (`contentCaptureAllowed(spaceId)`); an E2E space
reports metadata only. A space EDGE can read is one EDGE may observe, under the same opt-in.

**EDGE gates AI capture on the user's opt-in, read from the settings space.** The `Observability`
on a worker is per isolate and serves every user, so the gate is per invocation, not per instance.
Until EDGE resolves the invoking identity's settings space (via `DataService.getSpaceTags` over
the identity's spaces) the fanout stays out of the `otel-cf-workers` config: no AI records leave
EDGE, and content stripping still runs in front of the trace exporter.

## Sequencing

pkg.pr.new publishes only on push to `main`, so the dxos PR lands first and the EDGE PR pins the
catalog to its merge commit.

1. dxos: `@dxos/observability` bundles on workerd, Relay extension, `SpanProcessors` subpath;
   plugin-observability settings-space opt-in, workerd `Observability` module, delete the workerd
   handler stub.
2. edge: catalog bump; `otel-instrument.ts` adds content stripping; `edge-platform` builds the
   per-isolate `Observability` from Relay; tail-logger consumes `dxos:observability` into
   posthog-node; operation-service passes the observability to the plugin.
3. edge: per-invocation opt-in read from the settings space, then the fanout joins the
   `otel-cf-workers` config and AI analytics flow from EDGE.
4. Later: shared log flattening and severity mapping; OTLP logs from tail-logger.
