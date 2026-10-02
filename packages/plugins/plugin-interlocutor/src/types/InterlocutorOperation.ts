//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Feed, Ref } from '@dxos/echo';

/** Creates an interlocutor agent (instructions, feed and companion chat) in the space. */
export const CreateAgent = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.interlocutor.createAgent'),
    name: 'Create interlocutor agent',
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
 * Idempotent on `(agent, threadId)`: the chat carries the thread id as an `Obj.Meta` foreign key.
 */
export const EnsureThreadChat = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.interlocutor.ensureThreadChat'),
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
  }),
  output: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
    feed: Ref.Ref(Feed.Feed).annotate({ description: "The chat's message feed." }),
  }),
});

/** Lists the agents in the space with the number of chats each one owns. */
export const ListAgents = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.interlocutor.listAgents'),
    name: 'List interlocutor agents',
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
