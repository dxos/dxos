//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Instructions, Skill } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import { meta } from '#meta';

import OperationHandler from './capabilities/operation-handler';
import SkillDefinition from './capabilities/skill-definition';
import Toolkit from './capabilities/toolkit';

export const AssistantPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSkillDefinitionModule({ id: 'skill-definition', activate: SkillDefinition }),
  AppPlugin.addOperationHandlerModule({ id: 'operation-handler', activate: OperationHandler }),
  Plugin.addModule({
    id: 'toolkit',
    activatesOn: ActivationEvents.Startup,
    activate: Toolkit,
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
  Plugin.make,
);

export default AssistantPlugin;
