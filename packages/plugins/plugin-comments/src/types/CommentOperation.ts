//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
// Person is referenced in Actor.Actor's inferred type; importing it allows TypeScript to name
// it in the emitted .d.ts for AddMessage.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, AnchoredTo, Message, type Person, Thread } from '@dxos/types';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const Create = Operation.make({
  meta: { key: makeKey('create'), name: 'Create Comment Thread', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    anchor: Schema.optional(Schema.String),
    subject: Obj.Unknown,
  }),
  output: Schema.Void,
});

export const DeleteOutput = Schema.Struct({
  thread: Type.getSchema(Thread.Thread).annotations({ description: 'The deleted comment thread.' }),
  anchor: Type.getSchema(AnchoredTo.AnchoredTo).annotations({ description: 'The deleted anchor.' }),
}).pipe(Schema.partial);

export type DeleteOutput = Schema.Schema.Type<typeof DeleteOutput>;

export const Delete = Operation.make({
  meta: { key: makeKey('delete'), name: 'Delete Comment Thread', icon: 'ph--trash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: Type.getSchema(AnchoredTo.AnchoredTo),
    subject: Obj.Unknown,
    thread: Schema.optional(Type.getSchema(Thread.Thread)),
  }),
  output: DeleteOutput,
});

export const Select = Operation.make({
  meta: { key: makeKey('select'), name: 'Select Comment Thread', icon: 'ph--check--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    // Optional so callers can clear the active thread (e.g. after delete/close).
    current: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const ToggleResolved = Operation.make({
  meta: {
    key: makeKey('toggleResolved'),
    name: 'Toggle Resolved',
    icon: 'ph--check-circle--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Type.getSchema(Thread.Thread),
  }),
  output: Schema.Void,
});

export const AddMessage = Operation.make({
  meta: { key: makeKey('addMessage'), name: 'Add Comment', icon: 'ph--chat-text--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Obj.Unknown,
    anchor: Type.getSchema(AnchoredTo.AnchoredTo),
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});

export const DeleteMessageOutput = Schema.partial(
  Schema.Struct({
    message: Type.getSchema(Message.Message).annotations({ description: 'The deleted comment message.' }),
    messageIndex: Schema.Number.annotations({ description: 'The index the message was at.' }),
  }),
);

export type DeleteMessageOutput = Schema.Schema.Type<typeof DeleteMessageOutput>;

export const DeleteMessage = Operation.make({
  meta: { key: makeKey('deleteMessage'), name: 'Delete Comment', icon: 'ph--trash--regular' },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: Type.getSchema(AnchoredTo.AnchoredTo),
    subject: Obj.Unknown,
    messageId: Schema.String,
  }),
  output: DeleteMessageOutput,
});

/**
 * Restore a deleted comment thread (inverse of Delete).
 */
export const Restore = Operation.make({
  meta: {
    key: makeKey('restore'),
    name: 'Restore Comment Thread',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Type.getSchema(Thread.Thread).annotations({ description: 'The comment thread to restore.' }),
    anchor: Type.getSchema(AnchoredTo.AnchoredTo).annotations({ description: 'The anchor relation to restore.' }),
  }),
  output: Schema.Void,
});

/**
 * Restore a deleted comment message (inverse of DeleteMessage).
 */
export const RestoreMessage = Operation.make({
  meta: {
    key: makeKey('restoreMessage'),
    name: 'Restore Comment',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: Type.getSchema(AnchoredTo.AnchoredTo).annotations({ description: 'The anchor of the comment thread.' }),
    message: Type.getSchema(Message.Message).annotations({ description: 'The message to restore.' }),
    messageIndex: Schema.Number.annotations({ description: 'The index to restore the message at.' }),
  }),
  output: Schema.Void,
});

export const RespondToThread = Operation.make({
  meta: {
    key: makeKey('respondToThread'),
    name: 'Respond to Comment Thread',
    description: 'Runs one comment-thread agent turn against the given comment thread + subject.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Ref.Ref(Thread.Thread).annotations({ description: 'The comment thread to respond to.' }),
    subject: Ref.Ref(Obj.Unknown).annotations({ description: 'The object the comment thread is anchored to.' }),
  }),
  output: Schema.Void,
});

export const SetAgentConfig = Operation.make({
  meta: {
    key: makeKey('setAgentConfig'),
    name: 'Set Agent Config',
    description: 'Updates thread.agent. Undefined config disables the agent.',
  },
  services: [Database.Service],
  input: Schema.Struct({
    thread: Ref.Ref(Thread.Thread).annotations({ description: 'The comment thread to configure.' }),
    config: Schema.optional(Thread.AgentConfig).annotations({
      description: 'New agent config; omit to disable.',
    }),
  }),
  output: Schema.Void,
});

export const CreateProposals = Operation.make({
  meta: {
    key: makeKey('createProposals'),
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
