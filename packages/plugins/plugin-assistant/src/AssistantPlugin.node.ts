//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ContextBinding } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Blueprint, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Feed } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import { AppGraphBuilder, BlueprintDefinition, CreateObjectsNode, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const AssistantPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObjectsNode }),
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
      Routine.Routine,
      Agent.Agent,
      McpServer.McpServer,
      Plan.Plan,
      Sequence,
      Memory.Memory,
      Text.Text,
    ],
  }),
  Plugin.make,
);

export default AssistantPlugin;
