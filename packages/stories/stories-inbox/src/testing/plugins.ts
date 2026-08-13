//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/keys';

import { TRIP_LEGS } from './trip';

/**
 * `showItem` (in the 'storybook' layout mode) dispatches `LayoutOperation.UpdateCompanion` after
 * `Select`; `Select` is handled by AttentionPlugin (writes the selection this story reads), but no
 * installed plugin handles `UpdateCompanion` (that is DeckPlugin's), so stub it as a no-op.
 */
export const StorySyncPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.mailboxSync'),
    name: 'Mailbox Sync Story',
  }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('OperationHandler', { provides: [Capabilities.OperationHandler] }, () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
        ),
      ]),
    ),
  ),
  Plugin.make,
);

/**
 * Provides an AiService backed by a local Ollama instance so `AnalyzeMailbox` extracts facts against
 * a local model (start ollama with `OLLAMA_ORIGINS="*" ollama serve`). Contributed on the same
 * process-manager lifecycle as the FactStore LayerSpec so it is present when the operation resolves.
 */
export const StoryAiPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.inbox.story.ai'),
    name: 'Story Ollama AiService',
  }),
).pipe(
  Plugin.addModule({
    id: 'story-ai',
    // Restart-scoped: the process manager snapshots LayerSpecs once at boot (see AppCapability.layerSpec).
    activatesOn: ActivationEvents.Startup,
    provides: [Capabilities.LayerSpec],
    activate: Capability.makeModule(
      Effect.fnUntraced(function* () {
        return Capability.contribute(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'space', requires: [], provides: [AiService.AiService] }, () =>
            // `orDie`: a layer-construction ConfigError is a story setup fault, not a recoverable
            // operation error, and `LayerSpec` requires an empty error channel.
            AiServiceTestingPreset('ollama').pipe(Layer.orDie),
          ),
        );
      }),
    ),
  }),
  Plugin.make,
);

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
 * real provider. Mutually exclusive with {@link StoryAiPlugin} (both provide the `AiService`
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
