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
import { log } from '@dxos/log';
import { AiObservability, type Observability } from '@dxos/observability';

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
 * Installs the telemetry backend for the spans the AI stack already emits. The model call sites
 * know nothing about this: they annotate spans unconditionally, and a `Tracer` reaches them only
 * because every fiber on the process-manager runtime inherits what is provided here.
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

    // The provider's chunk is fetched on demand, and a chunk fetch fails routinely after a redeploy.
    // Telemetry setup degrades to no capture rather than failing a Startup module.
    const provider = yield* Effect.tryPromise(() =>
      AiObservability.createAiTracerProvider({
        captureEvent: (event, properties) => observability()?.events.captureEvent(event, properties),
        // Read per span rather than captured: the user can toggle telemetry mid-session, and
        // `captureEvent` alone would leave the decision to the PostHog client's own opt-out flag.
        // A span ending before observability is up reports nothing, which is the safe direction.
        captureEnabled: () => observability()?.enabled ?? false,
        allowContent: contentCaptureAllowed,
      }),
    ).pipe(Effect.catch((err) => Effect.sync(() => log.catch(err))));

    if (!provider) {
      return [];
    }

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
