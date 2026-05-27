//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { SpaceSchema } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Collection, Database, Key, Obj, Ref, DXN } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
import { Actor, AnchoredTo, Channel, Message, Thread } from '@dxos/types';

import { meta } from '#meta';

const THREAD_OPERATION = `${DXN.getName(meta.id)}.operation`;

export const OnCreateSpace = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.onCreateSpace`), name: 'On Create Space', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Collection.Collection,
    isDefault: Schema.Boolean.pipe(Schema.optional),
  }),
  output: Schema.Void,
});

export const CreateChannel = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.createChannel`), name: 'Create Channel', icon: 'ph--hash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceId: Key.SpaceId,
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Channel.Channel,
  }),
});

export const AppendChannelMessage = Operation.make({
  meta: {
    key: DXN.make(`${THREAD_OPERATION}.appendChannelMessage`),
    name: 'Append Channel Message',
    icon: 'ph--chat-text--regular',
  },
  // Note: Feed.FeedService is provided inside the handler from space.queues, not at the
  // operation level — the runtime can't fulfill it without a space context.
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Channel.Channel,
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});

export const Create = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.create`), name: 'Create Thread', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    anchor: Schema.optional(Schema.String),
    subject: Obj.Unknown,
  }),
  output: Schema.Void,
});

export const DeleteOutput = Schema.Struct({
  thread: Thread.Thread.annotations({ description: 'The deleted thread.' }),
  anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The deleted anchor.' }),
}).pipe(Schema.partial);

export type DeleteOutput = Schema.Schema.Type<typeof DeleteOutput>;

export const Delete = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.delete`), name: 'Delete Thread', icon: 'ph--trash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: AnchoredTo.AnchoredTo,
    subject: Obj.Unknown,
    thread: Schema.optional(Thread.Thread),
  }),
  output: DeleteOutput,
});

export const Select = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.select`), name: 'Select Thread', icon: 'ph--check--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    current: Schema.String,
  }),
  output: Schema.Void,
});

export const ToggleResolved = Operation.make({
  meta: {
    key: DXN.make(`${THREAD_OPERATION}.toggleResolved`),
    name: 'Toggle Resolved',
    icon: 'ph--check-circle--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Thread.Thread,
  }),
  output: Schema.Void,
});

export const AddMessage = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.addMessage`), name: 'Add Message', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Obj.Unknown,
    anchor: AnchoredTo.AnchoredTo,
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});

export const DeleteMessageOutput = Schema.partial(
  Schema.Struct({
    message: Message.Message.annotations({ description: 'The deleted message.' }),
    messageIndex: Schema.Number.annotations({ description: 'The index the message was at.' }),
  }),
);

export type DeleteMessageOutput = Schema.Schema.Type<typeof DeleteMessageOutput>;

export const DeleteMessage = Operation.make({
  meta: { key: DXN.make(`${THREAD_OPERATION}.deleteMessage`), name: 'Delete Message', icon: 'ph--trash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: AnchoredTo.AnchoredTo,
    subject: Obj.Unknown,
    messageId: Schema.String,
  }),
  output: DeleteMessageOutput,
});

/**
 * Restore a deleted thread (inverse of Delete).
 */
export const Restore = Operation.make({
  meta: {
    key: DXN.make(`${THREAD_OPERATION}.restore`),
    name: 'Restore Thread',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Thread.Thread.annotations({ description: 'The thread to restore.' }),
    anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The anchor relation to restore.' }),
  }),
  output: Schema.Void,
});

/**
 * Restore a deleted message (inverse of DeleteMessage).
 */
export const RestoreMessage = Operation.make({
  meta: {
    key: DXN.make(`${THREAD_OPERATION}.restoreMessage`),
    name: 'Restore Message',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The anchor of the thread.' }),
    message: Message.Message.annotations({ description: 'The message to restore.' }),
    messageIndex: Schema.Number.annotations({ description: 'The index to restore the message at.' }),
  }),
  output: Schema.Void,
});

export const RespondToThread = Operation.make({
  meta: {
    key: DXN.make(`${THREAD_OPERATION}.respondToThread`),
    name: 'Respond to Thread',
    description: 'Runs one comment-thread agent turn against the given thread + subject.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Ref.Ref(Thread.Thread).annotations({ description: 'The thread to respond to.' }),
    subject: Ref.Ref(Obj.Unknown).annotations({ description: 'The object the thread is anchored to.' }),
  }),
  output: Schema.Void,
});

export const SetAgentConfig = Operation.make({
  meta: {
    key: DXN.make(`${THREAD_OPERATION}.setAgentConfig`),
    name: 'Set Agent Config',
    description: 'Updates thread.agent. Undefined config disables the agent.',
  },
  services: [Database.Service],
  input: Schema.Struct({
    thread: Ref.Ref(Thread.Thread).annotations({ description: 'The thread to configure.' }),
    config: Schema.optional(Thread.AgentConfig).annotations({
      description: 'New agent config; omit to disable.',
    }),
  }),
  output: Schema.Void,
});

export const CreateProposals = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.thread.createProposals'),
    name: 'Create Proposals',
    description: 'Proposes a set of changes to a document.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the document.',
    }),
    diffs: Schema.Array(Schema.String).annotations({
      description: 'The diffs to propose for the document.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
