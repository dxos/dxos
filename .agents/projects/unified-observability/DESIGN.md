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

**Telemetry preferences live in the settings space.** Two annotations on the settings space
properties: telemetry enabled, and AI content capture. They replicate across the user's devices.
Local storage keeps a mirror so the preference applies before the space is readable at boot, and
the first device with the space migrates its local value in. `contentCaptureAllowed(spaceId)`
stays as the space-level predicate for future E2E spaces; the user-level consent is a facade flag
the plugin sets from the annotation.

**EDGE reports metadata only for AI until the preference reaches it.** The invocation carries no
user preference today. Fail closed: the Relay host sets `aiContentCapture` false. Follow-up: read
the settings space server-side via `DataService.getSpaceTags` once the invoking identity is known,
or carry the preference on the invocation.

## Sequencing

pkg.pr.new publishes only on push to `main`, so the dxos PR lands first and the EDGE PR pins the
catalog to its merge commit.

1. dxos: `@dxos/observability` bundles on workerd, Relay extension, `SpanProcessors` subpath,
   facade `aiContentCapture`; plugin-observability settings-space preferences, workerd
   `Observability` module, delete the workerd handler stub.
2. edge: catalog bump; `otel-instrument.ts` adds fanout + content stripping; `edge-platform`
   builds the per-isolate `Observability` from Relay; tail-logger consumes `dxos:observability`
   into posthog-node; operation-service passes the observability to the plugin.
3. Later: shared log flattening and severity mapping; OTLP logs from tail-logger; preference
   propagation to EDGE.
