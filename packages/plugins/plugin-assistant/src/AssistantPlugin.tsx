//
// Copyright 2023 DXOS.org
//

import {
  allOf,
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
} from '@dxos/app-framework';
import { BlueprintType } from '@dxos/assistant';
import { getSchemaTypename } from '@dxos/echo-schema';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { defineObjectForm } from '@dxos/plugin-space/types';

import { AiClient, AppGraphBuilder, IntentResolver, ReactSurface, Settings } from './capabilities';
import { meta } from './meta';
import translations from './translations';
import { AssistantAction, AIChatType, ServiceType, TemplateType, CompanionTo } from './types';

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
      activate: Settings,
    }),
    defineModule({
      id: `${meta.id}/module/metadata`,
      activatesOn: Events.SetupMetadata,
      activate: () => [
        contributes(Capabilities.Metadata, {
          id: BlueprintType.typename,
          metadata: {
            icon: 'ph--blueprint--regular',
          },
        }),
        contributes(Capabilities.Metadata, {
          id: getSchemaTypename(AIChatType)!,
          metadata: {
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
            getIntent: (_, options) => createIntent(AssistantAction.CreateChat, { space: options.space }),
          }),
        ),
        contributes(
          SpaceCapabilities.ObjectForm,
          defineObjectForm({
            objectSchema: BlueprintType,
            getIntent: () => createIntent(AssistantAction.CreateBlueprint),
          }),
        ),
      ],
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [ServiceType, TemplateType, CompanionTo]),
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
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      // TODO(wittjosiah): Should occur before the chat is loaded when surfaces activation is more granular.
      activatesBefore: [Events.SetupArtifactDefinition],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/ai-client`,
      activatesOn: allOf(ClientEvents.ClientReady, Events.SettingsReady),
      activate: AiClient,
    }),
  ]);
