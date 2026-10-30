//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Harness from '@dxos/assistant/Harness';
import * as Hook from '@dxos/compute/Hook';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { DXN } from '@dxos/echo';
import { trim } from '@dxos/util';

import { AgentOperation, MemoryOperation } from '#types';

const operations = [
  AgentOperation.CreateAgent,
  AgentOperation.EnsureChannelChat,
  AgentOperation.ListAgents,
  AgentOperation.ReadSource,
  MemoryOperation.ResolveEntity,
  MemoryOperation.Remember,
  MemoryOperation.Recall,
];

/**
 * The skill's end-request hook: re-prompts an agent that ended a channel conversation's request with text it never
 * sent. Defined beside the skill rather than in `#types` because the harness service it needs carries the session
 * runtime, which the UI must not load.
 */
export const EnsureReplySent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.ensureReplySent'),
    name: 'Ensure reply sent',
    description: 'Reminds the agent to send its reply when it answered a channel conversation in plain text.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  services: [Harness.HarnessService, OperationHandlerSet.OperationHandlerProvider],
  input: Schema.Struct({}),
  output: Hook.Output,
});

const tool = Operation.toolName;

export const key = 'org.dxos.skill.agentConversation';

export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Agent conversation',
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You are an autonomous agent: you converse with people in a chat that may mirror a channel conversation (a Discord thread, a DM, an email thread).
        Address the latest message. In a Composer chat your text is the reply; in a channel conversation it is sent
        nowhere, and you answer with the channel's tools instead.
        Be concise: answer in a few sentences unless asked for more detail.

        What you know is shared by every conversation, so what one person tells you can answer another:
        - When someone tells you what they are working on, a decision, a commitment or anything the team
          would want to know, call ${tool(MemoryOperation.ResolveEntity)} for them and then
          ${tool(MemoryOperation.Remember)} it as facts about them (e.g. works on, for current work), with their words as quote.
          Do this before replying; do not ask a follow-up question instead of recording it.
        - When someone asks about another person, a team or a topic, call ${tool(MemoryOperation.ResolveEntity)}
          for them and ${tool(MemoryOperation.Recall)} before answering, and say who told you and when.
        - Share what you know with members of this space, unless someone asked you not to.
        - When asked to read a document or link, call ${tool(AgentOperation.ReadSource)}; facts you learn are shared
          across conversations.
      `,
    }),
  });

export const hooks: Hook.Declaration[] = [
  { key: 'org.dxos.hook.agent.ensureReplySent', event: 'end-request', skill: key, operation: EnsureReplySent },
];
