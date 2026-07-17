//
// Copyright 2023 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
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
    AppPlugin.addAppGraphModule({
      requires: AppGraphBuilder.requires,
      provides: AppGraphBuilder.provides,
      activate: AppGraphBuilder,
    }),
    AppPlugin.addSkillDefinitionModule({
      requires: SkillDefinition.requires,
      provides: SkillDefinition.provides,
      activate: SkillDefinition,
    }),
    AppPlugin.addCreateObjectModule({
      requires: CreateObject.requires,
      provides: CreateObject.provides,
      activate: CreateObject,
    }),
    AppPlugin.addOperationHandlerModule({
      requires: OperationHandler.requires,
      provides: OperationHandler.provides,
      activate: OperationHandler,
    }),
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
      requires: EdgeModelResolver.requires,
      provides: EdgeModelResolver.provides,
      activate: EdgeModelResolver,
    }),
    Plugin.addModule({
      requires: LocalModelResolver.requires,
      provides: LocalModelResolver.provides,
      activate: LocalModelResolver,
    }),
    Plugin.addModule((options) => ({
      id: Capability.getModuleTag(AiService),
      requires: AiService.requires,
      provides: AiService.provides,
      activate: () => AiService(options),
    })),
    Plugin.addModule({
      requires: AiContextCapability.requires,
      provides: AiContextCapability.provides,
      activate: AiContextCapability,
    }),
    Plugin.addModule({
      requires: Toolkit.requires,
      provides: Toolkit.provides,
      activate: Toolkit,
    }),
    Plugin.addModule({
      requires: AgentRuntime.requires,
      provides: AgentRuntime.provides,
      activate: AgentRuntime,
    }),
  )
  .pipe(
    Plugin.addModule({
      requires: AgentHydrator.requires,
      provides: AgentHydrator.provides,
      activate: AgentHydrator,
    }),
    Plugin.make,
  );

export default AssistantPlugin;
