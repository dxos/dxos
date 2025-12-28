//
// Copyright 2023 DXOS.org
//

import { Capabilities, Capability, Events, Plugin, createResolver } from '@dxos/app-framework';

import { AppGraphBuilder, HelpCapabilities, HelpState, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { HelpAction, type Step } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = Plugin.define<HelpPluginOptions>(meta).pipe(
  Plugin.addModule({
    activatesOn: Events.Startup,
    activate: HelpState,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule(({ steps = [] }) => ({
    id: 'react-root',
    activatesOn: Events.Startup,
    activate: () => ReactRoot(steps),
  })),
  Plugin.addModule({
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: (context) =>
      Capability.contributes(
        Capabilities.IntentResolver,
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
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);
