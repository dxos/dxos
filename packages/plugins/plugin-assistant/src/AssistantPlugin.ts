//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client';
import { DeckEvents } from '@dxos/plugin-deck';
import { MarkdownEvents } from '@dxos/plugin-markdown';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import {
  AiService,
  AppGraphBuilder,
  AssistantState,
  BlueprintDefinition,
  CompanionChatProvisioner,
  CreateObject,
  EdgeModelResolver,
  LocalModelResolver,
  MarkdownExtension,
  Migrations,
  OperationHandler,
  ReactSurface,
  Settings,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AssistantEvents, AssistantOperation } from '#types';

export const AssistantPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      Chat.Chat,
      Chat.CompanionTo,
      Blueprint.Blueprint,
      AiContext.Binding,
      Feed.Feed,
      HasSubject.HasSubject,
      Message.Message,
      Routine.Routine,
      Agent.Agent,
      McpServer.McpServer,
      Plan.Plan,
      Sequence.Sequence,
      Memory.Memory,
      Text.Text,
    ],
  }),
  AppPlugin.addSettingsModule({ activate: Settings }),
  AppPlugin.addSurfaceModule({
    activate: ReactSurface,
    firesBeforeActivation: [AppActivationEvents.SetupArtifactDefinition],
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: MarkdownEvents.SetupExtensions,
    activate: MarkdownExtension,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: AppActivationEvents.SetupSettings,
    activate: AssistantState,
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(AssistantOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: EdgeModelResolver,
  }),
  Plugin.addModule({
    activatesOn: AssistantEvents.SetupAiServiceProviders,
    activate: LocalModelResolver,
  }),
  Plugin.addModule({
    firesBeforeActivation: [AssistantEvents.SetupAiServiceProviders],
    // TODO(dmaretskyi): This should activate lazily when the AI chat is used.
    activatesOn: ActivationEvents.Startup,
    activate: AiService,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Use a different event.
    activatesOn: ActivationEvents.Startup,
    activate: Toolkit,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.OperationInvokerReady,
      AppActivationEvents.AppGraphReady,
      DeckEvents.StateReady,
    ),
    activate: CompanionChatProvisioner,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);

export default AssistantPlugin;
