# Unified observability — Tasks

_Resume: land dxos/dxos#12939, then Phase 3 in an edge worktree pinned to its merge commit. Uncommitted: none. Last: PR opened, CI pending._

## Phase 1: `@dxos/observability` on workerd (dxos)

Make the package bundle and run under workerd without owning a tracer provider, and expose the
pieces EDGE plugs into `otel-cf-workers`.

### Tasks

- [x] **Per-condition workerd variants** — `#storage` no-op store, `#otel-traces` variant that
      attaches to the global tracer provider, `#posthog-transport` stub.
- [x] **Shared tracing backend helper** — one `TRACE_PROCESSOR.tracingBackend` builder used by the
      node, browser and workerd traces.
- [x] **`ObservabilityExtension.Relay`** — envelope type + extension publishing events, errors,
      AI and MCP records to a host-supplied `publish`.
- [x] **`@dxos/observability/SpanProcessors` subpath** — `AiContentStrippingSpanProcessor`,
      `FanoutSpanProcessor`/`addSpanProcessor`, `TagInjectorSpanProcessor`.
- [x] **Tests** — Relay extension, workerd traces variant.

## Phase 2: settings-space preferences (dxos, plugin-observability)

- [x] **Annotation** — `enabled` on the settings space properties.
- [x] **Operation** — `SetEnabled` writes the annotation.
- [x] **`SettingsSync` module** — on spaces ready: read annotations, seed from local on first
      device, apply remote changes live.
- [x] **Workerd `Observability` module** — `Observability` and `Namespace` modules split for
      workerd; delete `operation-handler.workerd.ts`.
- [x] **Changeset, build, lint, tests, PR.** — dxos/dxos#12939

## Phase 3: EDGE integration (edge repo, needs a slot)

- [ ] **Catalog bump** to the dxos merge commit.
- [ ] **`otel-instrument.ts`** — `AiContentStripping` in front of the channel exporter; the
      fanout waits for the per-invocation opt-in (Phase 4).
- [ ] **`edge-platform/observability.ts`** — per-isolate `Observability` from Relay, exposed as
      a binding/service.
- [ ] **tail-logger** — decode `dxos:observability` envelopes, forward with posthog-node
      (`DX_POSTHOG_API_KEY` secret).
- [ ] **operation-service** — pass `observability` to `ObservabilityPlugin`.
- [ ] **Verify** on a dev deploy: PostHog events from a server-side operation, no
      `dxos.ai.input` on SigNoz spans.

## Phase 4: follow-ups

- [ ] Per-invocation opt-in on EDGE: resolve the invoking identity's settings space
      (`DataService.getSpaceTags`), read `enabled`, gate the AI sink on it, then add the fanout to
      the `otel-cf-workers` config.
- [ ] `dx` reads the settings-space preference.
- [ ] Shared log flattening (`ctx_` vs `ctx.`) and severity mapping; OTLP logs from tail-logger.

### References

- Design: `.agents/projects/unified-observability/DESIGN.md`
- dxos #12936 (observability in node), plugin-observability workerd stub TODO.
