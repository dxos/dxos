//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { FunctionTrigger } from '@dxos/functions';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { RefArray } from '@dxos/react-client/echo';

import { AiClient, AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { AUTOMATION_PLUGIN, meta } from './meta';
import translations from './translations';
import { AutomationAction, ChainPromptType, ChainType, AIChatType, ServiceType } from './types';

// TODO(wittjosiah): Rename to AssistantPlugin?
export const AutomationPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/ai-client`,
      activatesOn: ClientEvents.ClientReady,
      activate: AiClient,
    }),
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: ChainType.typename,
          metadata: {
            placeholder: ['object placeholder', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--magic-wand--regular',
            // TODO(wittjosiah): Move out of metadata.
            loadReferences: async (chain: ChainType) => await RefArray.loadAll(chain.prompts ?? []),
          },
        }),
        contributes(Capabilities.Metadata, {
          id: AIChatType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(AutomationAction.Create, props),
            placeholder: ['object placeholder', { ns: AUTOMATION_PLUGIN }],
            icon: 'ph--atom--regular',
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(ClientCapabilities.SystemSchema, [ChainType, ChainPromptType, FunctionTrigger, ServiceType]),
        contributes(ClientCapabilities.Schema, [AIChatType]),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panels`,
      activatesOn: Events.Startup,
      activate: () => [
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'service-registry',
          label: ['service registry label', { ns: AUTOMATION_PLUGIN }],
          icon: 'ph--plugs--regular',
        }),
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'automation',
          label: ['automation panel label', { ns: AUTOMATION_PLUGIN }],
          icon: 'ph--magic-wand--regular',
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
  ]);
