//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, DXN, Feed, Obj, Ref } from '@dxos/echo';

import * as DiscordBinding from './DiscordBinding.ts';

/** Creates an agent (instructions, feed and companion chat) in the space. */
export const CreateAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.create'),
    name: 'Create agent',
    description: 'Creates an autonomous agent that converses with people from Discord threads and Composer chats.',
    icon: 'ph--chats-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    name: Schema.String.annotate({ description: 'The name of the agent.' }),
    instructions: Schema.optional(
      Schema.String.annotate({ description: 'Markdown instructions describing how the agent behaves.' }),
    ),
  }),
  output: Schema.Struct({
    agent: Ref.Ref(Agent.Agent),
  }),
});

/**
 * Maps a Discord thread to the agent's chat for it, creating the chat on first contact.
 * Idempotent on `(agent, source, threadId)`: the chat carries the thread id as an `Obj.Meta` foreign key.
 */
export const EnsureThreadChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.ensureThreadChat'),
    name: 'Ensure thread chat',
    description: 'Returns the chat that mirrors a Discord thread for the agent, creating it if absent.',
    icon: 'ph--chat-circle-dots--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that converses in the thread.' }),
    threadId: Schema.String.annotate({ description: 'The Discord thread id.' }),
    title: Schema.optional(Schema.String.annotate({ description: 'The thread title; names a new chat.' })),
    channelId: Schema.optional(Schema.String.annotate({ description: 'The Discord channel the thread belongs to.' })),
    source: Schema.optional(
      DiscordBinding.ThreadSource.annotate({
        description: "'discord.com' for a guild thread (default), 'discord.com/dm' for a DM channel id.",
      }),
    ),
  }),
  output: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
    feed: Ref.Ref(Feed.Feed).annotate({ description: "The chat's message feed." }),
  }),
});

/** Lists the agents in the space with the number of chats each one owns. */
export const ListAgents = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.list'),
    name: 'List agents',
    description: 'Lists the agents in the space and how many chats each one has.',
    icon: 'ph--list--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({
    agents: Schema.Array(
      Schema.Struct({
        agent: Ref.Ref(Agent.Agent),
        name: Schema.optional(Schema.String),
        chats: Schema.Number,
      }),
    ),
  }),
});

/** One skill bound to the agent's primary chat. */
export const AgentSkill = Schema.Struct({
  key: Schema.optional(Schema.String.annotate({ description: 'Registry key; absent for a space-authored skill.' })),
  name: Schema.String,
  /** True when the chat binds a space copy, whose instructions can be edited. */
  customized: Schema.Boolean,
  skill: Schema.optional(Ref.Ref(Skill.Skill).annotate({ description: 'The space copy, when customized.' })),
});

export interface AgentSkill extends Schema.Schema.Type<typeof AgentSkill> {}

/** Lists the skills bound to the agent's primary chat and whether each one is a customized space copy. */
export const ListSkills = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.listSkills'),
    name: 'List agent skills',
    description: "Lists the skills bound to the agent's conversation and whether each is customized.",
    icon: 'ph--blueprint--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
    chat: Schema.optional(
      Ref.Ref(Chat.Chat).annotate({ description: "One of the agent's chats; the primary chat if omitted." }),
    ),
  }),
  output: Schema.Struct({
    skills: Schema.Array(AgentSkill),
  }),
});

/**
 * Forks a plugin skill into an editable space Skill owned by the agent and rebinds the agent's chats
 * (primary and Discord threads) to it, so editing its instructions retunes the agent without a rebuild.
 * Idempotent: an existing copy is returned.
 */
export const CustomizeSkill = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.customizeSkill'),
    name: 'Customize agent skill',
    description: "Copies a skill's instructions into an editable space copy that the agent's chats use instead.",
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
    skill: Schema.String.annotate({ description: 'The registry key of the skill to customize.' }),
  }),
  output: Schema.Struct({
    skill: Ref.Ref(Skill.Skill),
  }),
});

/** Rebinds the agent's chats to the compiled skill and deletes the agent's customized copy. */
export const ResetSkill = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.resetSkill'),
    name: 'Reset agent skill',
    description: "Discards the agent's customized copy of a skill and goes back to the compiled one.",
    icon: 'ph--arrow-counter-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
    skill: Schema.String.annotate({ description: 'The registry key of the skill to reset.' }),
  }),
  output: Schema.Struct({}),
});

/**
 * Returns the agent's chat with a person, creating it with the agent's base context on first use.
 * The chat is keyed by the person, so it is never mistaken for the agent's primary chat.
 */
export const EnsureParticipantChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.ensureParticipantChat'),
    name: 'Ensure participant chat',
    description: "Returns the agent's Composer chat with a person, creating it if absent.",
    icon: 'ph--user-circle-plus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
    person: Ref.Ref(Obj.Unknown).annotate({ description: 'The person the chat is with.' }),
  }),
  output: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
  }),
});

/**
 * Has the agent read a document (e.g. a transcript of an earlier conversation) and record what it
 * learns — people, goals, memories, rules and follow-ups — by running a model turn with its memory tools.
 */
export const LearnFromDocument = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.learnFromDocument'),
    name: 'Learn from document',
    description: 'Has the agent read a document and record the people, goals, memories and rules it describes.',
    icon: 'ph--book-open-text--regular',
  },
  services: [Database.Service, AgentService.AgentService],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that learns.' }),
    document: Ref.Ref(Obj.Unknown).annotate({ description: 'A markdown document (or text) to learn from.' }),
  }),
  output: Schema.Struct({
    chat: Ref.Ref(Chat.Chat).annotate({ description: 'The chat the learning turn ran in.' }),
    memories: Schema.Number.annotate({ description: 'Memories recorded by the turn.' }),
    goals: Schema.Number.annotate({ description: 'Goals recorded by the turn.' }),
  }),
});
