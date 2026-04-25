//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ContextBinding } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan, ResearchGraph } from '@dxos/assistant-toolkit';
import { Blueprint, Prompt } from '@dxos/blueprints';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { ClientEvents } from '@dxos/plugin-client/types';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import {
  AiService,
  BlueprintDefinition,
  EdgeModelResolver,
  LocalModelResolver,
  Migrations,
  OperationHandler,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { AssistantEvents } from '#types';

/**
 * Headless variant of `AssistantPlugin` for Node-only contexts (CLI, tests).
 * Omits modules that depend on browser globals or the React/UI stack:
 * translations, ReactSurface, MarkdownExtension, AppGraphBuilder, Settings,
 * AssistantState, CompanionChatProvisioner, metadata (`createObject` hooks),
 * and the `on-space-created` hook.
 */
export const AssistantPlugin = Plugin.define(meta).pipe(
  // Headless plugin has no ReactSurface; full Assistant fires SetupArtifactDefinition from the surface module.
  // Activate blueprint definitions on Startup so AgentHandlers (and other blueprint ops) register in CLI/tests.
  AppPlugin.addBlueprintDefinitionModule({
    activate: BlueprintDefinition,
    activatesOn: ActivationEvents.Startup,
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      Chat.Chat,
      Chat.CompanionTo,
      Blueprint.Blueprint,
      ContextBinding,
      Feed.Feed,
      HasSubject.HasSubject,
      Message.Message,
      Prompt.Prompt,
      ResearchGraph.ResearchGraph,
      Agent.Agent,
      McpServer.McpServer,
      Plan.Plan,
      Sequence,
      Memory.Memory,
      Text.Text,
    ],
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
    activatesOn: ActivationEvents.Startup,
    activate: AiService,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: Toolkit,
  }),
  Plugin.addModule({
    activatesOn: ClientEvents.SetupMigration,
    activate: Migrations,
  }),
  Plugin.make,
);
