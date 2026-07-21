//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Instructions, Skill } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import {
  AgentHydrator,
  AgentRuntime,
  AiContext as AiContextCapability,
  AiService,
  AppGraphBuilder,
  AssistantState,
  AutomationTemplates,
  CompanionChatProvisioner,
  Connector,
  CreateObject,
  EdgeModelResolver,
  LocalModelResolver,
  MarkdownExtension,
  Migrations,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
  Settings,
  SkillDefinition,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { type AssistantPluginOptions } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const AssistantPlugin = Plugin.define<AssistantPluginOptions | void>(meta)
  .pipe(
    Plugin.addModule(AppGraphBuilder),
    Plugin.addModule(NavigationResolver),
    Plugin.addModule(SkillDefinition),
    Plugin.addModule(CreateObject),
    Plugin.addModule(OperationHandler),
    Plugin.addModule(
      AppCapability.schema([
        Chat.Chat,
        Chat.CompanionTo,
        Skill.Skill,
        AiContext.Binding,
        Feed.Feed,
        HasSubject.HasSubject,
        Message.Message,
        Instructions.Instructions,
        Agent.Agent,
        McpServer.McpServer,
        Plan.Plan,
        Sequence.Sequence,
        Memory.Memory,
        Text.Text,
      ]),
    ),
    Plugin.addModule(Settings),
    Plugin.addModule(ReactSurface),
    Plugin.addModule(AppCapability.translations(translations)),
    Plugin.addModule(AutomationTemplates),
    Plugin.addModule(MarkdownExtension),
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    Plugin.addModule(AssistantState),
    Plugin.addModule(EdgeModelResolver),
    Plugin.addModule(LocalModelResolver),
    Plugin.addModule(AiService),
    // Process-affinity `Harness.HarnessService` LayerSpec — needed so operations
    // dispatched as their own processes (e.g. via `Operation.invoke` from
    // `AiSession.createRequest` or `TriggerDispatcher`) can resolve
    // conversation-scoped services without an inline `Effect.provideService`
    // upstream. See `capabilities/ai-context.ts` for the rationale.
    Plugin.addModule(AiContextCapability),
    Plugin.addModule(AgentRuntime),
  )
  .pipe(
    Plugin.addModule(Toolkit),
    Plugin.addModule(AgentHydrator),
    Plugin.addModule(CompanionChatProvisioner),
    Plugin.addModule(Migrations),
    Plugin.addModule(Connector),
    Plugin.addModule(
      AppCapability.pluginAsset({
        pluginId: meta.profile.key,
        path: 'PLUGIN.mdl',
        content: pluginSpec,
        mimeType: 'application/x-mdl',
      }),
    ),
    Plugin.make,
  );

export default AssistantPlugin;
