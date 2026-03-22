//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database, Key, Obj, Ref } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Actor, AnchoredTo, Message, Thread } from '@dxos/types';

import { meta } from '../meta';

import { Channel } from '../types';

const THREAD_OPERATION = `${meta.id}.operation`;

export const OnCreateSpace = Operation.make({
  meta: { key: `${THREAD_OPERATION}.on-create-space`, name: 'On Create Space' },
  services: [Capability.Service],
  input: Schema.Struct({
    space: SpaceSchema,
    rootCollection: Collection.Collection,
    isDefault: Schema.Boolean.pipe(Schema.optional),
  }),
  output: Schema.Void,
});

export const CreateChannel = Operation.make({
  meta: { key: `${THREAD_OPERATION}.create-channel`, name: 'Create Channel' },
  services: [Capability.Service],
  input: Schema.Struct({
    spaceId: Key.SpaceId,
    name: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Channel.Channel,
  }),
});

export const CreateChannelThread = Operation.make({
  meta: { key: `${THREAD_OPERATION}.create-channel-thread`, name: 'Create Channel Thread' },
  services: [Capability.Service],
  input: Schema.Struct({
    channel: Channel.Channel,
  }),
  output: Schema.Struct({
    object: Thread.Thread,
  }),
});

export const Create = Operation.make({
  meta: { key: `${THREAD_OPERATION}.create`, name: 'Create Thread' },
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
  meta: { key: `${THREAD_OPERATION}.delete`, name: 'Delete Thread' },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: AnchoredTo.AnchoredTo,
    subject: Obj.Unknown,
    thread: Schema.optional(Thread.Thread),
  }),
  output: DeleteOutput,
});

export const Select = Operation.make({
  meta: { key: `${THREAD_OPERATION}.select`, name: 'Select Thread' },
  services: [Capability.Service],
  input: Schema.Struct({
    current: Schema.String,
  }),
  output: Schema.Void,
});

export const ToggleResolved = Operation.make({
  meta: { key: `${THREAD_OPERATION}.toggle-resolved`, name: 'Toggle Resolved' },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Thread.Thread,
  }),
  output: Schema.Void,
});

export const AddMessage = Operation.make({
  meta: { key: `${THREAD_OPERATION}.add-message`, name: 'Add Message' },
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
  meta: { key: `${THREAD_OPERATION}.delete-message`, name: 'Delete Message' },
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
  meta: { key: `${THREAD_OPERATION}.restore`, name: 'Restore Thread' },
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
  meta: { key: `${THREAD_OPERATION}.restore-message`, name: 'Restore Message' },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The anchor of the thread.' }),
    message: Message.Message.annotations({ description: 'The message to restore.' }),
    messageIndex: Schema.Number.annotations({ description: 'The index to restore the message at.' }),
  }),
  output: Schema.Void,
});

export const CreateProposals = Operation.make({
  meta: {
    key: 'org.dxos.function.thread.create-proposals',
    name: 'Create Proposals',
    description: 'Proposes a set of changes to a document.',
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
