//
// Copyright 2026 DXOS.org
//

import { AiContext } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Feed, type Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

// Loaded lazily by the plugin definition's schema module: these types ride heavy barrels
// (@dxos/assistant → @effect/ai → fast-check/zod) that must stay out of the boot floor.
const types: ReadonlyArray<Type.AnyEntity> = [
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
];

export default types;
