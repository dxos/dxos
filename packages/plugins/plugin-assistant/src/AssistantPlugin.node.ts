//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
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
import { type AssistantPluginOptions } from '#types';

export const AssistantPlugin = Plugin.define<AssistantPluginOptions | void>(meta)
  .pipe(
    AppPlugin.addAppGraphModule<AssistantPluginOptions | void>({
      requires: AppGraphBuilder.requires,
      provides: AppGraphBuilder.provides,
      activate: AppGraphBuilder,
    }),
    AppPlugin.addSkillDefinitionModule<AssistantPluginOptions | void>({
      requires: SkillDefinition.requires,
      provides: SkillDefinition.provides,
      activate: SkillDefinition,
    }),
    AppPlugin.addCreateObjectModule<AssistantPluginOptions | void>({
      requires: CreateObject.requires,
      provides: CreateObject.provides,
      activate: CreateObject,
    }),
    AppPlugin.addOperationHandlerModule<AssistantPluginOptions | void>({
      requires: OperationHandler.requires,
      provides: OperationHandler.provides,
      activate: OperationHandler,
    }),
    AppPlugin.addSchemaModule<AssistantPluginOptions | void>({
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
    Plugin.addLazyModule(EdgeModelResolver),
    Plugin.addLazyModule(LocalModelResolver),
    Plugin.addLazyModule(AiService),
    Plugin.addLazyModule(AiContextCapability),
    Plugin.addLazyModule(Toolkit),
    Plugin.addLazyModule(AgentRuntime),
  )
  .pipe(Plugin.addLazyModule(AgentHydrator), Plugin.make);

export default AssistantPlugin;
