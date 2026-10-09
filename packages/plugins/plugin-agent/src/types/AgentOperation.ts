//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, DXN, Feed, Obj, Ref } from '@dxos/echo';
import { Space } from '@dxos/halo';
import { Channel } from '@dxos/types';

import * as BrainService from './BrainService.ts';

/** Creates an agent (instructions, feed and companion chat) in the space. */
export const CreateAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.create'),
    name: 'Create agent',
    description:
      'Creates an autonomous agent that converses with people in channels (e.g. Discord) and Composer chats.',
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
 * Maps a conversation — a channel, or a thread inside one (a Discord thread or DM) — to the agent's
 * chat for it, creating the chat on first contact. Idempotent on `(agent, channel, thread)`: the chat
 * carries `AgentChannels.chatKey` as an `Obj.Meta` foreign key.
 */
export const EnsureChannelChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.ensureChannelChat'),
    name: 'Ensure channel chat',
    description: 'Returns the chat that mirrors a channel conversation for the agent, creating it if absent.',
    icon: 'ph--chat-circle-dots--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that converses in the channel.' }),
    channel: Ref.Ref(Channel.Channel).annotate({ description: 'The channel the conversation is in.' }),
    thread: Schema.optional(
      Schema.String.annotate({
        description: 'A backend-scoped thread id inside the channel (a Discord thread or DM).',
      }),
    ),
    title: Schema.optional(Schema.String.annotate({ description: 'The conversation title; names a new chat.' })),
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
 * (primary and channel conversations) to it, so editing its instructions retunes the agent without a rebuild.
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
    owner: Schema.optional(
      Schema.String.annotate({
        description: 'The DID of the identity the chat is private to; omit for a shared chat.',
      }),
    ),
    remote: Schema.optional(Schema.Boolean.annotate({ description: 'Run a chat created here on EDGE.' })),
  }),
  output: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
  }),
});

/**
 * The member's private chat with the agent: the person for their identity (found by DID, created with
 * their name on first use) and the participant chat with them, private to that identity.
 */
export const OpenPrivateChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.openPrivateChat'),
    name: 'Open private chat',
    description: "Returns the member's private chat with the agent, creating it (and their person) if absent.",
    icon: 'ph--lock-key--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent.' }),
    identityDid: Schema.String.annotate({ description: "The member's identity DID; the chat is private to it." }),
    name: Schema.optional(
      Schema.String.annotate({ description: "The member's display name, for a person created on first use." }),
    ),
    remote: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Run the chat on EDGE, so it continues (and can be woken) with the app closed.',
      }),
    ),
  }),
  output: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
    person: Ref.Ref(Obj.Unknown),
  }),
});

/**
 * Reads a source — a markdown document, text, chat transcript or web page — and pushes the RDF facts it
 * states to the agent's brain, delivering any watch they wake. A direct model call: no chat is created.
 * A chat is read incrementally: only the messages after the last read.
 */
export const ReadSource = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.readSource'),
    name: 'Read source',
    description:
      'Reads a document, chat transcript or web page and records the facts it states, with who said them and when.',
    icon: 'ph--book-open-text--regular',
  },
  services: [Database.Service, AiService.AiService, BrainService.BrainService, Space.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that reads.' }),
    source: Schema.optional(
      Ref.Ref(Obj.Unknown).annotate({ description: 'A markdown document, text or chat to read.' }),
    ),
    url: Schema.optional(Schema.String.annotate({ description: 'The URL of a web page; pass its text too.' })),
    text: Schema.optional(
      Schema.String.annotate({ description: 'The text to read, e.g. the content of the web page at url.' }),
    ),
  }),
  output: Schema.Struct({
    facts: Schema.Number.annotate({
      description: 'Facts recorded; none when a chat has no messages since the last read.',
    }),
    fired: Schema.Array(Schema.String).annotate({ description: 'The ids of the triggers that fired.' }),
    undelivered: Schema.Array(Schema.String).annotate({ description: 'Why a fired notification was not delivered.' }),
  }),
});
