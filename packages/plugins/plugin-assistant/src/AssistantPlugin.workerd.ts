//
// Copyright 2023 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Instructions, Skill } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { RoutineCapabilities } from '@dxos/plugin-routine';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import { meta } from '#meta';

import operationHandler from './capabilities/operation-handler';
import skillDefinition from './capabilities/skill-definition';
import toolkit from './capabilities/toolkit';

const SkillDefinition = Capability.inlineModule(
  'skill-definition',
  {
    provides: [
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
      RoutineCapabilities.AgentDelegationStrategy,
    ],
  },
  skillDefinition,
);

const OperationHandler = Capability.inlineModule(
  'operation-handler',
  { provides: [Capabilities.OperationHandler] },
  operationHandler,
);

const Toolkit = Capability.inlineModule('toolkit', { provides: [AppCapabilities.Toolkit] }, toolkit);

export const AssistantPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(SkillDefinition),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(Toolkit),
  Plugin.addLazyModule(
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
  Plugin.make,
);

export default AssistantPlugin;
