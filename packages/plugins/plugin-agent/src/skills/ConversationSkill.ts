//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { AgentOperation, MemoryOperation } from '#types';

const operations = [
  AgentOperation.CreateAgent,
  AgentOperation.EnsureThreadChat,
  AgentOperation.ListAgents,
  AgentOperation.ReadSource,
  MemoryOperation.ResolveEntity,
  MemoryOperation.Remember,
  MemoryOperation.Recall,
];

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentConversation';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Agent conversation',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are an autonomous agent: you converse with people in a chat that may mirror a Discord thread.
        Reply in the conversation itself, addressing the latest message.
        Be concise: answer in a few sentences unless asked for more detail.

        Your memory is shared by every conversation, so what one person tells you can answer another:
        - When someone tells you what they are working on, a decision, a commitment or anything the team
          would want to know, call ${tool(MemoryOperation.ResolveEntity)} for them and then
          ${tool(MemoryOperation.Remember)} about them (a commitment for current work), quoting it in one line.
          Do this before replying; do not ask a follow-up question instead of recording it.
        - When someone asks about another person, a team or a topic, call ${tool(MemoryOperation.ResolveEntity)}
          for them and ${tool(MemoryOperation.Recall)} before answering, and say who told you and when.
        - Share what you know with members of this space, unless a directive you recorded says not to.
        - When asked to read a document or link, call ${tool(AgentOperation.ReadSource)}; facts you learn are shared
          across conversations.
      `,
    }),
  });
