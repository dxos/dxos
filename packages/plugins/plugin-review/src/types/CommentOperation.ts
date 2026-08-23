//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
// Person is referenced in Actor.Actor's inferred type; importing it allows TypeScript to name
// it in the emitted .d.ts for AddMessage.
// eslint-disable-next-line unused-imports/no-unused-imports
import { Actor, AnchoredTo, Message, type Person, Thread } from '@dxos/types';

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.create'),
    name: 'Create Comment Thread',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    anchor: Schema.optional(Schema.String),
    subject: Obj.Unknown,
    /** Branch the comment pertains to (a branch-review comment); undefined = main/unbranched. */
    branch: Schema.optional(Schema.String),
  }),
  output: Schema.Void,
});

export const DeleteOutput = Schema.Struct({
  thread: Type.getSchema(Thread.Thread).annotate({ description: 'The deleted comment thread.' }),
  anchor: Type.getSchema(AnchoredTo.AnchoredTo).annotate({ description: 'The deleted anchor.' }),
}).mapFields(Struct.map(Schema.optional));

export type DeleteOutput = Schema.Schema.Type<typeof DeleteOutput>;

export const Delete = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.delete'),
    name: 'Delete Comment Thread',
    icon: 'ph--trash--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: Type.getSchema(AnchoredTo.AnchoredTo),
    subject: Obj.Unknown,
    thread: Schema.optional(Type.getSchema(Thread.Thread)),
  }),
  output: DeleteOutput,
});

export const Select = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.select'),
    name: 'Select Comment Thread',
    icon: 'ph--check--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    // Optional so callers can clear the active thread (e.g. after delete/close).
    current: Schema.optional(Schema.String),
    // When true (a deliberate click, not cursor movement), also open the comments companion. Done here
    // as a nested operation so the companion-open runs in an operation context — a top-level
    // `invokePromise(UpdateCompanion)` from the editor's event listener did not open the panel.
    reveal: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});

export const SetResolved = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.setResolved'),
    name: 'Set Resolved',
    icon: 'ph--check-circle--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Type.getSchema(Thread.Thread),
    // Required: the caller states the status it wants rather than flipping whatever is current.
    resolved: Schema.Boolean,
  }),
  output: Schema.Void,
});

export const AddMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.addMessage'),
    name: 'Add Comment',
    icon: 'ph--chat-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Obj.Unknown,
    anchor: Type.getSchema(AnchoredTo.AnchoredTo),
    sender: Actor.Actor,
    text: Schema.String,
  }),
  output: Schema.Void,
});

export const DeleteMessageOutput = Schema.Struct({
  message: Type.getSchema(Message.Message).annotate({ description: 'The deleted comment message.' }),
  messageIndex: Schema.Number.annotate({ description: 'The index the message was at.' }),
}).mapFields(Struct.map(Schema.optional));

export type DeleteMessageOutput = Schema.Schema.Type<typeof DeleteMessageOutput>;

export const DeleteMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.deleteMessage'),
    name: 'Delete Comment',
    icon: 'ph--trash--regular',
  },
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
    key: DXN.make('org.dxos.operation.review.restore'),
    name: 'Restore Comment Thread',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Type.getSchema(Thread.Thread).annotate({ description: 'The comment thread to restore.' }),
    anchor: Type.getSchema(AnchoredTo.AnchoredTo).annotate({ description: 'The anchor relation to restore.' }),
  }),
  output: Schema.Void,
});

/**
 * Restore a deleted comment message (inverse of DeleteMessage).
 */
export const RestoreMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.restoreMessage'),
    name: 'Restore Comment',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    anchor: Type.getSchema(AnchoredTo.AnchoredTo).annotate({ description: 'The anchor of the comment thread.' }),
    message: Type.getSchema(Message.Message).annotate({ description: 'The message to restore.' }),
    messageIndex: Schema.Number.annotate({ description: 'The index to restore the message at.' }),
  }),
  output: Schema.Void,
});

export const RespondToThread = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.respondToThread'),
    name: 'Respond to Comment Thread',
    description: 'Runs one comment-thread agent turn against the given comment thread + subject.',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    thread: Ref.Ref(Thread.Thread).annotate({ description: 'The comment thread to respond to.' }),
    subject: Ref.Ref(Obj.Unknown).annotate({ description: 'The object the comment thread is anchored to.' }),
  }),
  output: Schema.Void,
});

export const SetAgentConfig = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.setAgentConfig'),
    name: 'Set Agent Config',
    description: 'Updates thread.agent. Undefined config disables the agent.',
  },
  services: [Database.Service],
  input: Schema.Struct({
    thread: Ref.Ref(Thread.Thread).annotate({ description: 'The comment thread to configure.' }),
    config: Schema.optional(Thread.AgentConfig).annotate({
      description: 'New agent config; omit to disable.',
    }),
  }),
  output: Schema.Void,
});

export const CreateProposals = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.review.createProposals'),
    name: 'Create Proposals',
    description: 'Proposes a set of changes to a document.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({
      description: 'The ID of the document.',
    }),
    diffs: Schema.Array(Schema.String).annotate({
      description: 'The diffs to propose for the document.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
