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
import { makeTracer } from '@dxos/effect';
import { AiObservability } from '@dxos/observability';

import { ObservabilityCapabilities } from '#types';

/**
 * AI telemetry capture policy:
 *
 * | Observability toggle | Space                                 | Capture          |
 * |----------------------|---------------------------------------|------------------|
 * | off                  | any                                   | nothing          |
 * | on                   | EDGE has plaintext access (all today) | metadata+content |
 * | on                   | E2E-encrypted (future)                | metadata only    |
 *
 * Metadata is model, provider, tokens, latency, and trace/session ids. Content adds the prompt,
 * the response, and tool names — including tool results, i.e. data the agent read from the space.
 * The rationale: content that already leaves the device in plaintext for EDGE to replicate is not
 * newly exposed in kind by telemetry, whereas an E2E space promises that plaintext never reaches
 * infrastructure, and telemetry must not become the side channel that breaks it. The observability
 * toggle gates everything, since opting out drops the events at the PostHog client.
 *
 * This predicate is evaluated in the sink, not at the model call, so it applies to every event on
 * the way out (see `AiSpanProcessor` in `@dxos/observability`, which also holds the scrub rules).
 */
const contentCaptureAllowed = (_spaceId: string | undefined): boolean => {
  // Always true today because every space replicates through EDGE in plaintext. This MUST NOT
  // stay unconditional: once E2E-encrypted spaces exist this predicate has to return false for
  // them — and apply at the data boundary, not just the conversation's home space, since a turn
  // that reads from an E2E space via a cross-space reference would otherwise leak its content.
  return true;
};

/**
 * Installs the telemetry backend for the spans the AI stack already emits. The model call sites
 * know nothing about this: they annotate spans unconditionally, and a `Tracer` reaches them only
 * because every fiber on the process-manager runtime inherits what is provided here.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const observability = yield* ObservabilityCapabilities.Observability;

    const provider = yield* Effect.promise(() =>
      AiObservability.createAiTracerProvider({
        captureEvent: (event, properties) => observability.events.captureEvent(event, properties),
        allowContent: contentCaptureAllowed,
      }),
    );

    // Paired deliberately: the transformer serializes every prompt and response, so it is installed
    // with the exporter that consumes its output rather than by the harness that would pay for it
    // whether or not anything reads it.
    const layer = Layer.mergeAll(
      Layer.succeed(Tracer.Tracer, makeTracer(provider, '@dxos/plugin-observability/ai')),
      Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeContentSpanTransformer()),
    );

    return Capability.contribute(Capabilities.RuntimeServices, layer);
  }),
);
