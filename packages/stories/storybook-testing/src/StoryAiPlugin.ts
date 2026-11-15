//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { DXN } from '@dxos/keys';

export type Options = {
  /**
   * `'ollama'` targets a local model (`OLLAMA_ORIGINS="*" ollama serve`); otherwise supply the service layer, e.g. a
   * mock with canned output so a play test runs deterministically in CI.
   */
  ai: 'ollama' | (() => Layer.Layer<AiService.AiService>);
  /** LayerSpec affinity the consuming operations resolve at: `space` unless they run app-wide. */
  affinity?: 'space' | 'application';
};

/** Provides `AiService` on the layer operations resolve at invoke time, as the app provisions it. */
export const make = ({ ai, affinity = 'space' }: Options) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.storybook.plugin.ai'), name: 'Story AI Service' })).pipe(
    Plugin.addModule({
      id: 'org.dxos.storybook.plugin.ai.module.service',
      // Restart-scoped: the process manager snapshots LayerSpecs once at boot.
      activatesOn: ActivationEvents.Startup,
      provides: [Capabilities.LayerSpec],
      activate: () =>
        Effect.succeed([
          Capability.contribute(
            Capabilities.LayerSpec,
            LayerSpec.make({ affinity, requires: [], provides: [AiService.AiService] }, () =>
              // `orDie`: an unreachable provider is a story setup fault, and `LayerSpec` requires an empty error channel.
              ai === 'ollama' ? AiServiceTestingPreset('ollama').pipe(Layer.orDie) : ai(),
            ),
          ),
        ]),
    }),
    Plugin.make,
  )();
