//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Tracer from 'effect/Tracer';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import { AiTelemetry } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { makeGlobalTracer } from '@dxos/effect';
import * as AiObservability from '@dxos/observability/AiObservability';
import type * as Observability from '@dxos/observability/Observability';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';

import { ObservabilityCapabilities } from '#types';

/**
 * AI telemetry capture policy:
 *
 * | Observability toggle | Space                                 | Capture          |
 * |----------------------|---------------------------------------|------------------|
 * | off                  | any                                   | nothing          |
 * | on                   | EDGE has plaintext access (all today) | metadata+content |
 * | on                   | E2E-encrypted (future)                | metadata only    |
 * | on                   | not declared by the call site         | metadata only    |
 *
 * Metadata is model, provider, tokens, latency, and trace/session ids. Content adds the prompt,
 * the response, and tool names — including tool results, i.e. data the agent read from the space.
 * The rationale: content that already leaves the device in plaintext for EDGE to replicate is not
 * newly exposed in kind by telemetry, whereas an E2E space promises that plaintext never reaches
 * infrastructure, and telemetry must not become the side channel that breaks it.
 *
 * The last row is the fail-closed default. A space id reaches the span only from a call site that
 * declares one (`AiSession` does; the utility model calls behind summarization, tagging, and
 * extraction do not), so content capture is opt-in per call site and an undeclared one reports
 * metadata only. That is what keeps this predicate honest once it stops returning true: it can
 * never be asked about a space nobody named.
 *
 * Both this predicate and the telemetry opt-in are evaluated in the sink, not at the model call, so
 * they apply to every event on the way out (see `AiSpanProcessor` in `@dxos/observability`, which
 * also holds the scrub rules).
 */
const contentCaptureAllowed = (_spaceId: string): boolean => {
  // Always true today because every space replicates through EDGE in plaintext. This MUST NOT
  // stay unconditional: once E2E-encrypted spaces exist this predicate has to return false for
  // them — and apply at the data boundary, not just the conversation's home space, since a turn
  // that reads from an E2E space via a cross-space reference would otherwise leak its content.
  return true;
};

/**
 * Installs the process manager's tracing backend, and the AI capture that rides on it.
 *
 * Two things, deliberately together. The `Tracer` is the baseline: Effect's default is a no-op, so
 * every `withSpan` in the app was created and discarded, and one tracer on the process-manager
 * runtime makes all of them real. It is built over the OTel API's global provider, which is a proxy
 * — spans no-op until observability initialization registers the real provider behind it, and start
 * flowing from then on — so this can be contributed at Startup without waiting for that.
 *
 * AI capture is then only what the baseline does not already give: a processor that turns model-call
 * spans into `Generation` records, and effect's `CurrentSpanTransformer`, which is the only way to
 * reach prompt and response content since the GenAI conventions deliberately exclude it. It needs no
 * provider, no sampler and no tracer of its own — those all belong to the baseline.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Resolved per span rather than required, so this module does not put observability
    // initialization — which awaits its data providers, one of which fetches IP geolocation over
    // the network — between the Startup wave and the process-manager runtime it must beat. Nothing
    // here needs the instance until a model call ends, long after boot.
    const capabilities = yield* Capability.Service;
    const observability = (): Observability.Observability | undefined =>
      capabilities.getAll(ObservabilityCapabilities.Observability)[0];

    const detach = ObservabilityExtension.Otel.addSpanProcessor(
      new AiObservability.AiSpanProcessor({
        captureGeneration: (generation) => observability()?.generations.captureGeneration(generation),
        // Read per span rather than captured: the user can toggle telemetry mid-session, and
        // leaving the decision to the backend client would gate on its own opt-out flag, which is a
        // separate store. A span ending before observability is up reports nothing, which is safe.
        captureEnabled: () => observability()?.enabled ?? false,
        allowContent: contentCaptureAllowed,
      }),
    );
    yield* Effect.addFinalizer(() => Effect.sync(detach));

    const layer = Layer.mergeAll(
      Layer.succeed(Tracer.Tracer, makeGlobalTracer('@dxos/plugin-observability')),
      Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeSpanTransformer()),
    );

    return Capability.contribute(Capabilities.RuntimeServices, layer);
  }),
);
