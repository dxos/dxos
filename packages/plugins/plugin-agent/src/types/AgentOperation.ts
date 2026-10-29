//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, DXN, Feed, Hypergraph, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClientService } from '@dxos/edge-client';
import { Space } from '@dxos/halo';
import { Channel } from '@dxos/types';

import * as AgentEmail from './AgentEmail.ts';
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
 * Gives an agent an email address: an email channel in its channel list, claimed on EDGE once connected. An agent has
 * one address, so an agent that already has an email channel gets that channel back unchanged.
 */
export const CreateEmailChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.createEmailChannel'),
    name: 'Create email channel',
    description:
      'Gives the agent an email address, or returns the one it already has; connecting the channel claims the address on EDGE.',
    icon: 'ph--envelope--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that answers mail to the address.' }),
    ...AgentEmail.Properties.fields,
  }),
  output: Schema.Struct({
    channel: Ref.Ref(Channel.Channel),
  }),
});

/**
 * Maps a conversation - a channel, or a thread inside one (a Discord thread or DM) - to the agent's
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
 * Gives a new agent its own identity on EDGE: a brain with a self-owned HALO identity and a default space it owns,
 * which the caller joins; the members of that space are the agent's admins, and its creator is the owner. The agent
 * takes the brain's DID as soon as EDGE answers. Only `mint` provisions an agent without a DID, since the DID renames
 * its brain; for an agent with one, it finishes the join its creator's first call left undone. A client without an
 * EDGE client changes nothing; a refusal fails, and is safe to retry, since EDGE answers its creator's repeated
 * request with the same identity.
 */
export const EnsureIdentity = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.ensureIdentity'),
    name: 'Ensure agent identity',
    description: "Gives the agent its own identity and space on EDGE and puts the caller in the agent's space.",
    icon: 'ph--identification-card--regular',
    // Out of reach of models and MCP clients: provisioning an agent that has already talked would rename its brain.
    skipRegistry: true,
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent, in the space the operation runs in.' }),
    mint: Schema.optional(
      Schema.Boolean.annotate({
        description: 'Provisions an agent without a DID; only for one created a moment ago, whose brain is empty.',
      }),
    ),
  }),
  output: Schema.Struct({
    provisioned: Schema.Boolean.annotate({ description: 'True when EDGE minted an identity for the agent now.' }),
    identityDid: Schema.optional(Schema.String.annotate({ description: "The agent's DID, when it has one." })),
  }),
});

/**
 * Brings an agent into the space the operation runs in, as a presence of itself: its name, DID and instructions,
 * linked to its home by `AgentPresence.homeKey`, so it reads and writes its home's brain. Idempotent: the
 * agent's existing presence in the space (or the agent itself, in its home) is returned.
 */
export const InviteAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.invite'),
    name: 'Invite agent',
    description:
      "Invites an agent from another space into this one; it keeps one brain across the spaces it is in. Only the agent's admins may, which EDGE enforces.",
    icon: 'ph--user-plus--regular',
    // Invoked by AgentAdmission after the members panel admits the agent, never by a model.
    skipRegistry: true,
  },
  services: [Database.Service, Hypergraph.Service, Capability.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({
      description:
        "The agent to invite, in any space it is in; one whose home the caller cannot reach is read from the agent's own space.",
    }),
  }),
  output: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent in this space.' }),
    created: Schema.Boolean.annotate({ description: 'False when the agent was already in this space.' }),
  }),
});

/**
 * Reads a source - a markdown document, text, chat transcript or web page - and pushes the RDF facts it
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

//
// Fact feeds: an agent's brain on EDGE indexes the fact feeds registered with it (`/compute/brain/:spaceId/:agentId/fact-feeds`).
//

const FactFeeds = Schema.Struct({
  feeds: Schema.Array(Schema.String).annotate({ description: 'EIDs of the fact feeds the brain indexes.' }),
});

/** Has the agent's brain index a fact feed from now on, from the start of the feed. */
export const AddFactFeed = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.addFactFeed'),
    name: 'Add fact feed',
    description: "Has the agent's brain on EDGE index a fact feed, reading it from where it left off.",
    icon: 'ph--brain--regular',
  },
  services: [Database.Service, EdgeHttpClientService],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent whose brain is to index the fact feed.' }),
    feed: Ref.Ref(Feed.Feed).annotate({ description: 'The fact feed to index.' }),
  }),
  output: FactFeeds,
});

/** Stops the agent's brain indexing a fact feed; the facts it already read stay. */
export const RemoveFactFeed = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.removeFactFeed'),
    name: 'Remove fact feed',
    description: "Stops the agent's brain on EDGE indexing a fact feed; what it read stays.",
    icon: 'ph--brain--regular',
  },
  services: [Database.Service, EdgeHttpClientService],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent whose brain is to stop indexing the fact feed.' }),
    feed: Ref.Ref(Feed.Feed).annotate({ description: 'The fact feed to stop indexing.' }),
  }),
  output: FactFeeds,
});

/** The fact feeds the agent's brain indexes. */
export const ListFactFeeds = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.listFactFeeds'),
    name: 'List fact feeds',
    description: "Lists the fact feeds the agent's brain on EDGE indexes.",
    icon: 'ph--brain--regular',
  },
  services: [Database.Service, EdgeHttpClientService],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent whose brain indexes the fact feeds.' }),
  }),
  output: FactFeeds,
});
