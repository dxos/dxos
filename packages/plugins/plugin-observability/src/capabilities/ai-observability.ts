//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiTelemetry } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { makeTracer } from '@dxos/effect';
import { type SpaceId } from '@dxos/keys';
import { AiObservability } from '@dxos/observability';

import { ObservabilityCapabilities } from '#types';

/**
 * AI telemetry capture policy:
 *
 * | Observability toggle | Space                              | Capture                |
 * |----------------------|------------------------------------|------------------------|
 * | off                  | any                                | nothing                |
 * | on                   | EDGE has plaintext access (all today) | tier 2 (full content) |
 * | on                   | E2E-encrypted (future)             | tier 1 (metadata only) |
 *
 * Tier 1 = model, provider, tokens, latency, trace/session ids. Tier 2 adds prompt, response,
 * and tool names — including tool results, i.e. data the agent read from the space. The rationale:
 * content that already leaves the device in plaintext for EDGE to replicate is not newly exposed
 * in kind by telemetry, whereas an E2E space promises that plaintext never reaches infrastructure,
 * and telemetry must not become the side channel that breaks it. The observability toggle gates
 * everything: opted-out users send neither tier (`posthog.opt_out_capturing` drops the events).
 * Scrub rules for both tiers live in `AiSpanProcessor` (`@dxos/observability`).
 */
const contentCaptureAllowed = (_space: SpaceId | undefined): boolean => {
  // Always true today because every space replicates through EDGE in plaintext. This MUST NOT
  // stay unconditional: once E2E-encrypted spaces exist this predicate has to return false for
  // them — and apply at the data boundary, not just the conversation's home space, since a turn
  // that reads from an E2E space via a cross-space reference would otherwise leak its content
  // into a tier-2 trace.
  return true;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const observability = yield* ObservabilityCapabilities.Observability;

    const provider = AiObservability.createAiTracerProvider((event, properties) =>
      observability.events.captureEvent(event, properties),
    );
    const tracer = makeTracer(provider, '@dxos/plugin-observability/ai');
    const contentTransformer = AiTelemetry.makeContentSpanTransformer();

    const middleware: AppCapabilities.AiServiceMiddleware = (service, { space }) =>
      AiTelemetry.wrap(service, {
        tracer,
        spanTransformer: contentCaptureAllowed(space) ? contentTransformer : undefined,
      });

    return Capability.contribute(AppCapabilities.AiServiceMiddleware, middleware);
  }),
);
