//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability, createIntent } from '@dxos/app-framework';
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

export const AssistantPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'settings',
    activatesOn: Events.SetupSettings,
    activate: Settings,
  }),
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Events.SetupSettings,
    activate: AssistantState,
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () => [
      Capability.contributes(Capabilities.Metadata, {
        id: Type.getTypename(Assistant.Chat),
        metadata: {
          icon: 'ph--atom--regular',
          iconHue: 'sky',
          createObjectIntent: ((_, options) =>
            createIntent(AssistantAction.CreateChat, { db: options.db })) satisfies CreateObjectIntent,
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
        id: Type.getTypename(Blueprint.Blueprint),
        metadata: {
          icon: 'ph--blueprint--regular',
          iconHue: 'sky',
          inputSchema: AssistantAction.BlueprintForm,
          createObjectIntent: ((props) =>
            createIntent(AssistantAction.CreateBlueprint, props)) satisfies CreateObjectIntent,
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
        id: Type.getTypename(Prompt.Prompt),
        metadata: {
          icon: 'ph--scroll--regular',
          iconHue: 'sky',
          createObjectIntent: (() => createIntent(AssistantAction.CreatePrompt)) satisfies CreateObjectIntent,
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
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
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [
        Assistant.Chat,
        Assistant.CompanionTo,
        Blueprint.Blueprint,
        HasSubject.HasSubject,
        Prompt.Prompt,
        ResearchGraph,
        Sequence,
      ]),
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) => createIntent(AssistantAction.OnCreateSpace, params)),
  }),
  Plugin.addModule({
    id: 'repair',
    activatesOn: ClientEvents.SpacesReady,
    activate: Repair,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    // TODO(wittjosiah): Should occur before the chat is loaded when surfaces activation is more granular.
    activatesBefore: [Events.SetupArtifactDefinition],
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'edge-model-resolver',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: EdgeModelResolver,
  }),
  Plugin.addModule({
    id: 'local-model-resolver',
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: LocalModelResolver,
  }),
  Plugin.addModule({
    id: 'ai-service',
    activatesBefore: [AssistantEvents.SetupAiServiceProviders],
    // TODO(dmaretskyi): This should activate lazily when the AI chat is used.
    activatesOn: Events.Startup,
    activate: AiService,
  }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.addModule({
    id: 'toolkit',
    // TODO(wittjosiah): Use a different event.
    activatesOn: Events.Startup,
    activate: Toolkit,
  }),
  Plugin.make,
);
