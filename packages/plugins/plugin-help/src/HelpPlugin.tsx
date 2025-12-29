//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createResolver } from '@dxos/app-framework';

import { AppGraphBuilder, HelpState, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { HelpAction, HelpCapabilities, type Step } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = Plugin.define<HelpPluginOptions>(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: HelpState,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ steps = [] }) => ({
    id: 'react-root',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => ReactRoot(steps),
  })),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({
    activate: (context) =>
      Capability.contributes(
        Common.Capability.IntentResolver,
        createResolver({
          intent: HelpAction.Start,
          resolve: () => {
            const state = context.getCapability(HelpCapabilities.MutableState);
            state.running = true;
          },
        }),
      ),
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.make,
);
