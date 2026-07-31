//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { LayerSpec, Operation, OperationHandlerSet } from '@dxos/compute';
import { DXN } from '@dxos/keys';

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
