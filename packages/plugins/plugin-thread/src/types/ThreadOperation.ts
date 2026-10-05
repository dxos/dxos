//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Key, Ref, Type } from '@dxos/echo';
import { Actor, Channel, Person } from '@dxos/types';

export const CreateChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.createChannel'),
    name: 'Create Channel',
    icon: 'ph--hash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceId: Key.SpaceId,
    name: Schema.optional(Schema.String),
    /** Backend provider id; defaults to the local feed backend. */
    kind: Schema.optional(Schema.String),
    /** Per-backend create options passed to the provider's makeConfig. */
    options: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Channel.Channel),
  }),
});

export const AppendChannelMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.appendChannelMessage'),
    name: 'Append Channel Message',
    icon: 'ph--chat-text--regular',
  },
  // Note: Database.Service is provided inside the handler from space.db, not at the
  // operation level — the runtime can't fulfill it without a space context.
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Type.getSchema(Channel.Channel),
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});

/**
 * What a backend reports about a message it posted. `properties` are stamped on the copy a caller
 * records locally, so a mirror of that record (EDGE's Discord bot) can tell it was already posted.
 */
export const SendReceipt = Schema.Struct({
  messageIds: Schema.optional(Schema.Array(Schema.String).annotate({ description: 'Backend ids of the posts.' })),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

export interface SendReceipt extends Schema.Schema.Type<typeof SendReceipt> {}

/** Whether a backend's connection (a bot gateway, an IRC socket) is up. */
export const ConnectionStatus = Schema.Struct({
  running: Schema.Boolean,
  /** Backend-specific state name, e.g. a gateway's `connecting` or `ready`. */
  state: Schema.optional(Schema.String),
  detail: Schema.optional(Schema.String.annotate({ description: 'A short human-readable summary.' })),
  error: Schema.optional(Schema.String.annotate({ description: 'Why the connection last failed.' })),
});

export interface ConnectionStatus extends Schema.Schema.Type<typeof ConnectionStatus> {}

/** Sends text to a channel, or to a thread inside it, through the channel's backend. */
export const SendToChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.sendToChannel'),
    name: 'Send to channel',
    description: "Sends a message to a channel, or to a thread inside it, through the channel's backend.",
    icon: 'ph--paper-plane-tilt--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    channel: Ref.Ref(Channel.Channel).annotate({ description: 'The channel to send to.' }),
    thread: Schema.optional(
      Schema.String.annotate({ description: 'A backend-scoped thread id (a Discord thread or DM channel id).' }),
    ),
    text: Schema.String.annotate({ description: 'The message.' }),
  }),
  output: Schema.Struct({
    delivered: Schema.Boolean,
    ...SendReceipt.fields,
    reason: Schema.optional(Schema.String.annotate({ description: 'Why the message was not delivered.' })),
  }),
});

/** Opens (or finds) a direct conversation with a person through the channel's account. */
export const OpenDirect = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.openDirect'),
    name: 'Open direct conversation',
    description:
      "Opens a direct conversation (a DM) with a person through the channel's account; returns its thread id.",
    icon: 'ph--user-circle--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    channel: Ref.Ref(Channel.Channel).annotate({ description: 'The channel whose account sends the direct message.' }),
    person: Ref.Ref(Person.Person).annotate({ description: 'The person to reach.' }),
  }),
  output: Schema.Struct({
    thread: Schema.optional(
      Schema.String.annotate({ description: 'The direct thread id; pass it to sendToChannel as `thread`.' }),
    ),
    reason: Schema.optional(Schema.String.annotate({ description: 'Why the person cannot be reached directly.' })),
  }),
});

/** Starts the channel's connection (or reconfigures a running one). */
export const ConnectChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.connectChannel'),
    name: 'Connect channel',
    description: "Starts the channel backend's connection, e.g. a bot gateway.",
    icon: 'ph--play--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    channel: Ref.Ref(Channel.Channel).annotate({ description: 'The channel to connect.' }),
  }),
  output: Schema.Struct({ status: ConnectionStatus }),
});

/** Stops the channel's connection. */
export const DisconnectChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.disconnectChannel'),
    name: 'Disconnect channel',
    description: "Stops the channel backend's connection.",
    icon: 'ph--stop--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    channel: Ref.Ref(Channel.Channel).annotate({ description: 'The channel to disconnect.' }),
  }),
  output: Schema.Struct({ status: ConnectionStatus }),
});

/** Reports the channel's connection status. */
export const GetChannelStatus = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.thread.getChannelStatus'),
    name: 'Get channel status',
    description: "Reports whether the channel backend's connection is up.",
    icon: 'ph--pulse--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    channel: Ref.Ref(Channel.Channel).annotate({ description: 'The channel to report on.' }),
  }),
  output: Schema.Struct({ status: ConnectionStatus }),
});
