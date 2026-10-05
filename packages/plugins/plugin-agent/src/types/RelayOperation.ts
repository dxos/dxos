//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Format, Obj, Ref } from '@dxos/echo';
import { Channel, Task } from '@dxos/types';

import * as Relay from './Relay.ts';

/** Records a relay: a task in the agent's own task list plus its delivery record. */
export const CreateRelay = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.createRelay'),
    name: 'Create relay',
    description:
      'Records a request to pass a message to someone ("tell Josiah about X") as a task in the agent\'s task list. Call before delivering it.',
    icon: 'ph--arrows-left-right--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent that carries the message.' }),
    recipient: Ref.Ref(Obj.Unknown).annotate({ description: 'The person or organization to tell (resolve first).' }),
    requester: Schema.optional(
      Ref.Ref(Obj.Unknown).annotate({ description: 'The person who asked (the current speaker, resolved first).' }),
    ),
    message: Schema.String.annotate({ description: 'Exactly what the requester asked to pass on.' }),
    replyChannel: Schema.optional(
      Ref.Ref(Channel.Channel).annotate({ description: "The requester's current channel, for the report." }),
    ),
    replyThread: Schema.optional(
      Schema.String.annotate({ description: "The requester's current thread inside that channel, if any." }),
    ),
    dueInHours: Schema.optional(
      Schema.Number.annotate({ description: `Hours until the relay is overdue (default ${Relay.DEFAULT_DUE_HOURS}).` }),
    ),
  }),
  output: Schema.Struct({
    relay: Ref.Ref(Relay.Relay),
    task: Ref.Ref(Task.Task),
  }),
});

/** Moves a relay on and keeps its task's status in step (see `Relay.taskStatus`). */
export const UpdateRelay = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.updateRelay'),
    name: 'Update relay',
    description:
      'Records progress on a relay: delivered (the recipient got it), reported (the requester was told the outcome), failed or expired.',
    icon: 'ph--check-circle--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    relay: Ref.Ref(Relay.Relay),
    status: Relay.Status,
    outcome: Schema.optional(
      Schema.String.annotate({ description: 'What the recipient said, or why it could not be delivered.' }),
    ),
  }),
  output: Schema.Struct({
    relay: Ref.Ref(Relay.Relay),
  }),
});

export const ListedRelay = Schema.Struct({
  relay: Ref.Ref(Relay.Relay),
  recipient: Ref.Ref(Obj.Unknown),
  requester: Schema.optional(Ref.Ref(Obj.Unknown)),
  message: Schema.String,
  status: Relay.Status,
  dueAt: Format.DateTime,
  overdue: Schema.Boolean,
  replyChannel: Schema.optional(Ref.Ref(Channel.Channel)),
  replyThread: Schema.optional(Schema.String),
  outcome: Schema.optional(Schema.String),
});

export interface ListedRelay extends Schema.Schema.Type<typeof ListedRelay> {}

/** Lists the agent's relays, oldest first. */
export const ListRelays = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.listRelays'),
    name: 'List relays',
    description: 'Lists the messages the agent was asked to pass on, with their status and whether they are overdue.',
    icon: 'ph--list-checks--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent),
    status: Schema.optional(Relay.Status.annotate({ description: 'Only relays in this status.' })),
  }),
  output: Schema.Struct({
    relays: Schema.Array(ListedRelay),
  }),
});

/** `chat`: appended to a Composer chat; `channel`: posted through a channel backend (Discord, freeq, …). */
export const DeliveryChannel = Schema.Literals(['chat', 'channel']);
export type DeliveryChannel = Schema.Schema.Type<typeof DeliveryChannel>;

/**
 * Delivers a message to a person through whatever conversation the agent has with them: their chat with
 * the agent (see `ChatParticipant`, posted through its channel when it mirrors one), else a direct
 * message opened through one of the agent's channels. Given a relay, delivery to its recipient
 * marks it `delivered` and delivery to its requester marks it `reported`.
 */
export const SendMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.sendMessage'),
    name: 'Send message',
    description:
      "Sends a message to a person through the agent's conversation with them (their chat, else a direct message through one of the agent's channels). Pass the relay it belongs to.",
    icon: 'ph--paper-plane-tilt--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent).annotate({ description: 'The agent sending the message.' }),
    recipient: Ref.Ref(Obj.Unknown).annotate({ description: 'The person to deliver to.' }),
    text: Schema.String.annotate({ description: 'The message, written to the recipient.' }),
    relay: Schema.optional(Ref.Ref(Relay.Relay).annotate({ description: 'The relay this delivery belongs to.' })),
  }),
  output: Schema.Struct({
    delivered: Schema.Boolean,
    via: Schema.optional(DeliveryChannel),
    chat: Schema.optional(Ref.Ref(Chat.Chat).annotate({ description: 'The chat the message was recorded in.' })),
    reason: Schema.optional(Schema.String.annotate({ description: 'Why the message was not delivered.' })),
  }),
});

/** Marks an agent's chat as its conversation with a person, so deliveries to them land there. */
export const AssignChatParticipant = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.assignChatParticipant'),
    name: 'Assign chat participant',
    description: 'Records which person an agent chat is with, so messages for them are delivered into it.',
    icon: 'ph--user-circle-plus--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    chat: Ref.Ref(Chat.Chat),
    person: Ref.Ref(Obj.Unknown).annotate({ description: 'The person the chat is with.' }),
  }),
  output: Schema.Struct({}),
});
