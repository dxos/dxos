//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN, Key, Type } from '@dxos/echo';
// Person is referenced in Actor.Actor's inferred type; importing it allows TypeScript to name
// it in the emitted .d.ts for AppendChannelMessage.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, Channel, Message, type Person } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const CreateChannel = Operation.make({
  meta: { key: makeKey('createChannel'), name: 'Create Channel', icon: 'ph--hash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceId: Key.SpaceId,
    name: Schema.optional(Schema.String),
    /** Backend provider id; defaults to the local feed backend. */
    kind: Schema.optional(Schema.String),
    /** Per-backend create options passed to the provider's makeConfig. */
    options: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Channel.Channel),
  }),
});

export const AppendChannelMessage = Operation.make({
  meta: {
    key: makeKey('appendChannelMessage'),
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
    /** Thread to post into (the root message's id). Absent posts a new root to the main view. */
    threadId: Schema.optional(Schema.String),
    /** Message being quote-replied to, if any. Offered inside threads only. */
    parentMessage: Schema.optional(Type.getSchema(Message.Message)),
  }),
  output: Schema.Void,
});

export const RemoveChannelMessage = Operation.make({
  meta: {
    key: makeKey('removeChannelMessage'),
    name: 'Remove Channel Message',
    icon: 'ph--trash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Type.getSchema(Channel.Channel),
    message: Type.getSchema(Message.Message),
  }),
  output: Schema.Void,
});

/**
 * Creates the thread rooted at a message, so it exists before anyone has replied. Creating a thread
 * is a deliberate act — a message nobody threaded is not a thread — and the thread is an object of
 * its own in the channel's feed. Idempotent: a message that already roots a thread is left alone,
 * which is what holds one thread per message short of a network partition.
 */
export const CreateThread = Operation.make({
  meta: {
    key: makeKey('createThread'),
    name: 'Create Thread',
    icon: 'ph--chats-circle--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Type.getSchema(Channel.Channel),
    /** Message the thread branches from. */
    message: Type.getSchema(Message.Message),
  }),
  output: Schema.Struct({
    /** Id of the thread rooted at that message, whether this call created it or found it. */
    threadId: Schema.String,
  }),
});

/**
 * Adds the sender's reaction to a message, or removes it when they have already reacted with the
 * same emoji. Reactions are per-author items, so a toggle appends or tombstones one item rather than
 * mutating shared state.
 */
export const ToggleReaction = Operation.make({
  meta: {
    key: makeKey('toggleReaction'),
    name: 'Toggle Reaction',
    icon: 'ph--smiley--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Type.getSchema(Channel.Channel),
    message: Type.getSchema(Message.Message),
    sender: Actor.Actor,
    emoji: Schema.String,
  }),
  output: Schema.Struct({
    /** Whether the sender's reaction is present after the toggle. */
    reacted: Schema.Boolean,
  }),
});
