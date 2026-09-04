//
// Copyright 2026 DXOS.org
//

//
// Composable story plugins shared by the stories-* packages — the recurring one-off plugins every
// harness used to hand-roll: module-surface contribution, a story AiService, and the
// `UpdateCompanion` no-op stub.
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

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

/** Contributes a package's module surfaces so a story can drive them from a `ModuleContainer` layout. */
export const makeModuleSurfacesPlugin = (key: string, surfaces: Capabilities.ReactSurface) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make(key), name: 'Story Module Surfaces' })).pipe(
    Plugin.addModule({
      id: `${key}.module.surfaces`,
      provides: [Capabilities.ReactSurface],
      activate: () => Effect.succeed([Capability.contribute(Capabilities.ReactSurface, surfaces)]),
    }),
    Plugin.make,
  )();

export type StoryAiPluginOptions = {
  /**
   * `'ollama'` targets a local model (`OLLAMA_ORIGINS="*" ollama serve`); otherwise supply the
   * service layer (e.g. a mock with canned output, so a play test runs deterministically in CI).
   */
  ai: 'ollama' | (() => Layer.Layer<AiService.AiService>);
  /** LayerSpec affinity the consuming operations resolve at — `space` unless they run app-wide. */
  affinity?: 'space' | 'application';
};

/**
 * Provides `AiService` on the layer the operations resolve at invoke time, matching how the app
 * provisions it — so an operation invoked from a story reaches a model instead of failing to
 * resolve the service.
 */
export const StoryAiPlugin = ({ ai, affinity = 'space' }: StoryAiPluginOptions) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.storybook.plugin.ai'), name: 'Story AI Service' })).pipe(
    Plugin.addModule({
      id: 'org.dxos.storybook.plugin.ai.module.service',
      // Restart-scoped: the process manager snapshots LayerSpecs once at boot (see AppCapability.layerSpec).
      activatesOn: ActivationEvents.Startup,
      provides: [Capabilities.LayerSpec],
      activate: () =>
        Effect.succeed([
          Capability.contribute(
            Capabilities.LayerSpec,
            LayerSpec.make({ affinity, requires: [], provides: [AiService.AiService] }, () =>
              ai === 'ollama'
                ? // `orDie`: a missing/unreachable provider is a story setup fault, not a
                  // recoverable operation error, and `LayerSpec` requires an empty error channel.
                  AiServiceTestingPreset('ollama').pipe(Layer.orDie)
                : ai(),
            ),
          ),
        ]),
    }),
    Plugin.make,
  )();

/**
 * `showItem` (in the 'storybook' layout mode) dispatches `LayoutOperation.UpdateCompanion` after
 * `Select`; no story-installed plugin handles `UpdateCompanion` (that is DeckPlugin's), so stub it
 * as a no-op.
 */
export const UpdateCompanionStubPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.storybook.plugin.companionStub'), name: 'Companion Stub' }),
).pipe(
  Plugin.addModule({
    id: 'org.dxos.storybook.plugin.companionStub.module.handler',
    provides: [Capabilities.OperationHandler],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void)),
        ),
      ]),
  }),
  Plugin.make,
);
