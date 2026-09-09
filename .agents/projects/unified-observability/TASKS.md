# Unified observability — Tasks

_Resume: land dxos/dxos#12609 then #12939 (stacked), then Phase 3 in an edge worktree pinned to the merge commit. Uncommitted: none. Last: stacked on #12609, sync module replaced by the settings reactor._

## Phase 1: `@dxos/observability` on workerd (dxos)

Make the package bundle and run under workerd without owning a tracer provider, and expose the
pieces EDGE plugs into `otel-cf-workers`.

### Tasks

- [x] **Per-condition workerd variants** — `#storage` no-op store, `#otel-traces` variant that
      attaches to the global tracer provider, `#posthog-transport` resolving to the `posthog-node`
      transport (it ships a workerd build).
- [x] **Shared tracing backend helper** — one `TRACE_PROCESSOR.tracingBackend` builder used by the
      node, browser and workerd traces.
- [x] **`ObservabilityExtension.Relay`** — envelope type + extension publishing events, errors,
      AI and MCP records to a host-supplied `publish`.
- [x] **`@dxos/observability/SpanProcessors` subpath** — `AiContentStrippingSpanProcessor`,
      `FanoutSpanProcessor`/`addSpanProcessor`, `TagInjectorSpanProcessor`.
- [x] **Tests** — Relay extension and replay, workerd traces variant, PostHog per-capture and
      anonymous attribution.
- [x] **Relay replay + attribution** — `Relay.replay` for the consuming host, per-record
      `distinctId` resolvers on Relay and the PostHog node transport, anonymous service attribution
      with person profiles off, workerd routed to the real PostHog transport.

## Phase 2: settings-space opt-in (dxos, plugin-observability)

Stacked on dxos#12609, whose generic binder syncs every plugin settings atom through the
`AppSettings` object in the settings space.

- [x] **`SettingsReactor` module** — follows the settings atom's `enabled` into the backends and
      the local mirror, so a change synced from another device applies like the toggle.
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

- [ ] The vitest `workerd` project (Miniflare pool) segfaults on importing `@dxos/log` or
      `@dxos/async` alone, so nothing above `@dxos/util` can be tested in it. EDGE bundles both with
      esbuild and runs them daily, so this is the harness, not the packages. Until it is fixed the
      EDGE bundle is the workerd proof for this package.

- [ ] Per-invocation opt-in on EDGE: resolve the invoking identity's settings space
      (`DataService.getSpaceTags`), read `AppSettings.shared["org.dxos.plugin.observability"]`,
      gate the AI sink on it, then add the fanout to the `otel-cf-workers` config.
- [ ] `dx` reads the settings-space preference.
- [ ] Shared log flattening (`ctx_` vs `ctx.`) and severity mapping; OTLP logs from tail-logger.

### References

- Design: `.agents/projects/unified-observability/DESIGN.md`
- dxos #12936 (observability in node), plugin-observability workerd stub TODO.
