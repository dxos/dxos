//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
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
  CreateObject,
  EdgeModelResolver,
  LocalModelResolver,
  OperationHandler,
  SkillDefinition,
  Toolkit,
} from '#capabilities';
import { meta } from '#meta';
import { type AssistantPluginOptions, AssistantEvents } from '#types';

export const AssistantPlugin = Plugin.define<AssistantPluginOptions | void>(meta)
  .pipe(
    AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
    AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
    AppPlugin.addCreateObjectModule({ activate: CreateObject }),
    AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
    AppPlugin.addSchemaModule({
      schema: [
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
    Plugin.addModule((options) => ({
      id: Capability.getModuleTag(AiService),
      firesBeforeActivation: [AssistantEvents.SetupAiServiceProviders],
      activatesOn: ActivationEvents.SetupProcessManager,
      activate: () => AiService(options),
    })),
    Plugin.addModule({
      activatesOn: ActivationEvents.SetupProcessManager,
      activate: AiContextCapability,
    }),
    Plugin.addModule({
      activatesOn: ActivationEvents.Startup,
      activate: Toolkit,
    }),
    Plugin.addModule({
      activatesOn: ActivationEvents.SetupProcessManager,
      activate: AgentRuntime,
    }),
  )
  .pipe(
    Plugin.addModule({
      activatesOn: ActivationEvents.ProcessManagerReady,
      activate: AgentHydrator,
    }),
    Plugin.make,
  );

export default AssistantPlugin;
