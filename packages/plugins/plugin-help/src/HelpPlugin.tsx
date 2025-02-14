//
// Copyright 2023 DXOS.org
//

import { createResolver, defineModule, definePlugin, Events, contributes, Capabilities } from '@dxos/app-framework';

import { AppGraphBuilder, HelpState, ReactRoot, ReactSurface } from './capabilities';
import { HelpCapabilities } from './capabilities/capabilities';
import { meta } from './meta';
import translations from './translations';
import { type Step, HelpAction } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = ({ steps = [] }: HelpPluginOptions) =>
  definePlugin(meta, [
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
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: (context) =>
        contributes(
          Capabilities.IntentResolver,
          createResolver({
            intent: HelpAction.Start,
            resolve: () => {
              const state = context.requestCapability(HelpCapabilities.MutableState);
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
