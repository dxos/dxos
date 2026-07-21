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
    Plugin.addModule(AppGraphBuilder),
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
    Plugin.addModule(EdgeModelResolver),
    Plugin.addModule(LocalModelResolver),
    Plugin.addModule(AiService),
    Plugin.addModule(AiContextCapability),
    Plugin.addModule(Toolkit),
    Plugin.addModule(AgentRuntime),
  )
  .pipe(Plugin.addModule(AgentHydrator), Plugin.make);

export default AssistantPlugin;
