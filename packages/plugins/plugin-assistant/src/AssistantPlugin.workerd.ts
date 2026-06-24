//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Skill, Instructions } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const AssistantPlugin = Plugin.define(meta).pipe(
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
  Plugin.make,
);

export default AssistantPlugin;
