//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events, oneOf } from '@dxos/app-framework';
import { FunctionTrigger } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { RefArray } from '@dxos/react-client/echo';

import { AppGraphBuilder, ReactSurface } from './capabilities';
import { AUTOMATION_PLUGIN, meta } from './meta';
import translations from './translations';
import { ChainPromptType, ChainType } from './types';

export const AutomationPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
      activate: () =>
        contributes(Capabilities.Metadata, {
          id: ChainType.typename,
          metadata: {
            placeholder: ['object placeholder', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--magic-wand--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (chain: ChainType) => await RefArray.loadAll(chain.prompts ?? []),
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupClient,
      activate: () => contributes(ClientCapabilities.SystemSchema, [ChainType, ChainPromptType, FunctionTrigger]),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panels`,
      activatesOn: Events.Startup,
      activate: () => [
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'automation',
          label: ['open automation panel label', { ns: AUTOMATION_PLUGIN }],
          icon: 'ph--magic-wand--regular',
        }),
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'assistant',
          label: ['open assistant panel label', { ns: AUTOMATION_PLUGIN }],
          icon: 'ph--atom--regular',
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
