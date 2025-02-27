//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { DeckCapabilities } from '@dxos/plugin-deck';

import { AppGraphBuilder, IntentResolver, ReactContext, ReactSurface } from './capabilities';
import { CALLS_PLUGIN, meta } from './meta';
import translations from './translations';

export const CallsPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/react-context`,
      activatesOn: Events.Startup,
      activate: ReactContext,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panels`,
      activatesOn: Events.Startup,
      activate: () => [
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'calls',
          label: ['calls panel label', { ns: CALLS_PLUGIN }],
          icon: 'ph--phone-call--regular',
        }),
      ],
    }),
  ]);
