//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createResolver, defineModule, definePlugin } from '@dxos/app-framework';

import { AppGraphBuilder, HelpCapabilities, HelpState, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { HelpAction, type Step } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = definePlugin<HelpPluginOptions>(meta, ({ steps = [] }) => [
  defineModule({
    id: `${meta.id}/module/state`,
    activatesOn: Events.Startup,
    activate: HelpState,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/react-root`,
    activatesOn: Events.Startup,
    activate: () => ReactRoot(steps),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: (context) =>
      contributes(
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
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
]);
