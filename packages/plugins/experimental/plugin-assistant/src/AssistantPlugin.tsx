//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, createIntent, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { DeckCapabilities, DeckEvents } from '@dxos/plugin-deck';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AiClient, AppGraphBuilder, IntentResolver, ReactSurface, AssistantSettings } from './capabilities';
import { ASSISTANT_PLUGIN, meta } from './meta';
import translations from './translations';
import { AutomationAction, AIChatType, ServiceType, TemplateType } from './types';

export const AssistantPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/settings`,
      activatesOn: Events.SetupSettings,
      activate: AssistantSettings,
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: TemplateType.typename,
          metadata: {
            placeholder: ['template title placeholder', { ns: ASSISTANT_PLUGIN }],
            icon: 'ph--code-block--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: AIChatType.typename,
          metadata: {
            placeholder: ['chat title placeholder', { ns: ASSISTANT_PLUGIN }],
            icon: 'ph--atom--regular',
          },
        }),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/object-form`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => [
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: AIChatType,
            getIntent: (_, options) => createIntent(AutomationAction.CreateChat, { spaceId: options.space.id }),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: TemplateType,
            getIntent: () => createIntent(AutomationAction.CreateTemplate),
          }),
        ),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [ServiceType, TemplateType]),
    }),
    defineModule({
      id: `${meta.id}/module/complementary-panels`,
      activatesOn: DeckEvents.SetupComplementaryPanels,
      activate: () =>
        contributes(DeckCapabilities.ComplementaryPanel, {
          id: 'service-registry',
          label: ['service registry label', { ns: ASSISTANT_PLUGIN }],
          icon: 'ph--plugs--regular',
        }),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the chat is loaded when surfaces activation is more granular.
      activatesBefore: [Events.SetupArtifactDefinition],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/ai-client`,
      activatesOn: ClientEvents.ClientReady,
      activate: AiClient,
    }),
  ]);
