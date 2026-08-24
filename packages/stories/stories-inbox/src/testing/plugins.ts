//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { DXN } from '@dxos/keys';

import { TRIP_LEGS } from './trip';

/** Resolve the canned structured output for the trip extractor from the prompt (contains the body). */
const resolvePayload = (prompt: string): unknown => {
  if (prompt.includes('AF0001')) {
    return TRIP_LEGS[0];
  }
  if (prompt.includes('AF0002')) {
    return TRIP_LEGS[1];
  }

  return {};
};

/**
 * Story `AiService` whose `generateObject` returns a per-message flight payload and `generateText`
 * returns a static summary, so the template-driven TripMessageExtractor runs end-to-end without a
 * real provider. Mutually exclusive with the shared `StoryAiPlugin` (both provide the `AiService`
 * LayerSpec) — a story registers one or the other per variant.
 */
export const StoryTripAiPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.tripAi'),
    name: 'Story Trip AiService',
  }),
).pipe(
  Plugin.addModule({
    id: 'trip-ai-service',
    // Restart-scoped: the process manager snapshots LayerSpecs once at boot (see AppCapability.layerSpec).
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.LayerSpec],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'application', requires: [], provides: [AiService.AiService] }, () =>
            Layer.succeed(AiService.AiService, {
              model: () =>
                Layer.succeed(LanguageModel.LanguageModel, {
                  generateText: () => Effect.succeed({ text: 'Mock summary.', content: [] }),
                  generateObject: (options: any) =>
                    Effect.succeed({ value: resolvePayload(String(options?.prompt ?? '')), content: [] }),
                  streamText: () => Stream.empty,
                } as any),
            }),
          ),
        ),
      ]),
  }),
  Plugin.make,
);
