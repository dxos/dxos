//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin } from '@dxos/app-framework';
import { ResearchGraph } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { HasSubject } from '@dxos/types';

import {
  AiService,
  AppGraphBuilder,
  AssistantState,
  BlueprintDefinition,
  EdgeModelResolver,
  IntentResolver,
  LocalModelResolver,
  ReactSurface,
  Repair,
  Settings,
  Toolkit,
} from './capabilities';
import { AssistantEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';
import { Assistant, AssistantAction } from './types';

export const AssistantPlugin = definePlugin(meta, () => [
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
    id: `${meta.id}/module/state`,
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Events.SetupSettings,
    activate: AssistantState,
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () => [
      contributes(Capabilities.Metadata, {
        id: Type.getTypename(Assistant.Chat),
        metadata: {
          icon: 'ph--atom--regular',
          iconHue: 'sky',
          createObjectIntent: ((_, options) =>
            createIntent(AssistantAction.CreateChat, { space: options.space })) satisfies CreateObjectIntent,
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Type.getTypename(Blueprint.Blueprint),
        metadata: {
          icon: 'ph--blueprint--regular',
          iconHue: 'sky',
          formSchema: AssistantAction.BlueprintForm,
          createObjectIntent: ((props) =>
            createIntent(AssistantAction.CreateBlueprint, props)) satisfies CreateObjectIntent,
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Type.getTypename(Prompt.Prompt),
        metadata: {
          icon: 'ph--scroll--regular',
          iconHue: 'sky',
          createObjectIntent: (() => createIntent(AssistantAction.CreatePrompt)) satisfies CreateObjectIntent,
        },
      }),
      contributes(Capabilities.Metadata, {
        id: Type.getTypename(Sequence),
        metadata: {
          icon: 'ph--circuitry--regular',
          iconHue: 'sky',
          createObjectIntent: (() => createIntent(AssistantAction.CreateSequence)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
    ],
  }),
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      contributes(ClientCapabilities.Schema, [
        Assistant.Chat,
        Assistant.CompanionTo,
        Blueprint.Blueprint,
        HasSubject.HasSubject,
        Prompt.Prompt,
        ResearchGraph,
        Sequence,
      ]),
  }),
  defineModule({
    id: `${meta.id}/module/on-space-created`,
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      contributes(SpaceCapabilities.OnCreateSpace, (params) => createIntent(AssistantAction.OnCreateSpace, params)),
  }),
  defineModule({
    id: `${meta.id}/module/repair`,
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
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
    id: `${meta.id}/module/edge-model-resolver`,
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: EdgeModelResolver,
  }),
  defineModule({
    id: `${meta.id}/module/local-model-resolver`,
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: LocalModelResolver,
  }),
  defineModule({
    id: `${meta.id}/module/ai-service`,
    activatesBefore: [AssistantEvents.SetupAiServiceProviders],
    // TODO(dmaretskyi): This should activate lazily when the AI chat is used.
    activatesOn: Events.Startup,
    activate: AiService,
  }),
  defineModule({
    id: `${meta.id}/module/blueprint`,
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  defineModule({
    id: `${meta.id}/module/toolkit`,
    // TODO(wittjosiah): Use a different event.
    activatesOn: Events.Startup,
    activate: Toolkit,
  }),
]);
