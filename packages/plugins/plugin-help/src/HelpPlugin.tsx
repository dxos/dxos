//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createResolver } from '@dxos/app-framework';

import { AppGraphBuilder, HelpCapabilities, HelpState, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { HelpAction, type Step } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = Plugin.define<HelpPluginOptions>(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: HelpState,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule(({ steps = [] }) => ({
    id: 'react-root',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => ReactRoot(steps),
  })),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
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
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);
