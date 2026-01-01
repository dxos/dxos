//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Key } from '@dxos/echo';
import * as Operation from '@dxos/operation';
import { EchoObjectSchema, SpaceSchema } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';
import { Actor, AnchoredTo, Message, Thread } from '@dxos/types';

import { meta } from '../meta';

import * as Channel from './Channel';

export namespace ThreadAction {
  export class OnCreateSpace extends Schema.TaggedClass<OnCreateSpace>()(`${meta.id}/action/on-space-created`, {
    input: Schema.Struct({
      space: SpaceSchema,
      rootCollection: Collection.Collection,
      isDefault: Schema.Boolean.pipe(Schema.optional),
    }),
    output: Schema.Void,
  }) {}

  export class CreateChannel extends Schema.TaggedClass<CreateChannel>()(`${meta.id}/action/create-channel`, {
    input: Schema.Struct({
      spaceId: Key.SpaceId,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Channel.Channel,
    }),
  }) {}

  export class CreateChannelThread extends Schema.TaggedClass<CreateChannelThread>()(
    `${meta.id}/action/create-channel-thread`,
    {
      input: Schema.Struct({
        channel: Channel.Channel,
      }),
      output: Schema.Struct({
        object: Thread.Thread,
      }),
    },
  ) {}

  export class Create extends Schema.TaggedClass<Create>()(`${meta.id}/action/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      anchor: Schema.optional(Schema.String),
      subject: EchoObjectSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Delete extends Schema.TaggedClass<Delete>()(`${meta.id}/action/delete`, {
    input: Schema.Struct({
      anchor: AnchoredTo.AnchoredTo,
      subject: EchoObjectSchema,
      thread: Schema.optional(Thread.Thread),
    }),
    output: Schema.Void,
  }) {}

  export class Select extends Schema.TaggedClass<Select>()(`${meta.id}/action/select`, {
    input: Schema.Struct({
      current: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class ToggleResolved extends Schema.TaggedClass<ToggleResolved>()(`${meta.id}/action/toggle-resolved`, {
    input: Schema.Struct({
      thread: Thread.Thread,
    }),
    output: Schema.Void,
  }) {}

  export class AddMessage extends Schema.TaggedClass<AddMessage>()(`${meta.id}/action/add-message`, {
    input: Schema.Struct({
      subject: EchoObjectSchema,
      anchor: AnchoredTo.AnchoredTo,
      sender: Actor.Actor,
      text: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class DeleteMessage extends Schema.TaggedClass<DeleteMessage>()(`${meta.id}/action/delete-message`, {
    input: Schema.Struct({
      anchor: AnchoredTo.AnchoredTo,
      subject: EchoObjectSchema,
      messageId: Schema.String,
      message: Schema.optional(Message.Message),
      messageIndex: Schema.optional(Schema.Number),
    }),
    output: Schema.Void,
  }) {}
}

const THREAD_OPERATION = `${meta.id}/operation`;

/**
 * Operations for the Thread plugin.
 * Note: Complex ECHO types are typed as Schema.Any to avoid serialization issues.
 */
export namespace ThreadOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${THREAD_OPERATION}/on-create-space`, name: 'On Create Space' },
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.Boolean.pipe(Schema.optional),
      }),
      output: Schema.Void,
    },
  });

  export const CreateChannel = Operation.make({
    meta: { key: `${THREAD_OPERATION}/create-channel`, name: 'Create Channel' },
    schema: {
      input: Schema.Struct({
        spaceId: Key.SpaceId,
        name: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Channel.Channel,
      }),
    },
  });

  export const CreateChannelThread = Operation.make({
    meta: { key: `${THREAD_OPERATION}/create-channel-thread`, name: 'Create Channel Thread' },
    schema: {
      input: Schema.Struct({
        channel: Channel.Channel,
      }),
      output: Schema.Struct({
        object: Thread.Thread,
      }),
    },
  });

  export const Create = Operation.make({
    meta: { key: `${THREAD_OPERATION}/create`, name: 'Create Thread' },
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        anchor: Schema.optional(Schema.String),
        subject: EchoObjectSchema,
      }),
      output: Schema.Void,
    },
  });

  export const DeleteOutput = Schema.Struct({
    thread: Thread.Thread.annotations({ description: 'The deleted thread.' }),
    anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The deleted anchor.' }),
  }).pipe(Schema.partial);

  export type DeleteOutput = Schema.Schema.Type<typeof DeleteOutput>;

  export const Delete = Operation.make({
    meta: { key: `${THREAD_OPERATION}/delete`, name: 'Delete Thread' },
    schema: {
      input: Schema.Struct({
        anchor: AnchoredTo.AnchoredTo,
        subject: EchoObjectSchema,
        thread: Schema.optional(Thread.Thread),
      }),
      output: DeleteOutput,
    },
  });

  export const Select = Operation.make({
    meta: { key: `${THREAD_OPERATION}/select`, name: 'Select Thread' },
    schema: {
      input: Schema.Struct({
        current: Schema.String,
      }),
      output: Schema.Void,
    },
  });

  export const ToggleResolved = Operation.make({
    meta: { key: `${THREAD_OPERATION}/toggle-resolved`, name: 'Toggle Resolved' },
    schema: {
      input: Schema.Struct({
        thread: Thread.Thread,
      }),
      output: Schema.Void,
    },
  });

  export const AddMessage = Operation.make({
    meta: { key: `${THREAD_OPERATION}/add-message`, name: 'Add Message' },
    schema: {
      input: Schema.Struct({
        subject: EchoObjectSchema,
        anchor: AnchoredTo.AnchoredTo,
        sender: Actor.Actor,
        text: Schema.String,
      }),
      output: Schema.Void,
    },
  });

  export const DeleteMessageOutput = Schema.partial(
    Schema.Struct({
      message: Message.Message.annotations({ description: 'The deleted message.' }),
      messageIndex: Schema.Number.annotations({ description: 'The index the message was at.' }),
    }),
  );

  export type DeleteMessageOutput = Schema.Schema.Type<typeof DeleteMessageOutput>;

  export const DeleteMessage = Operation.make({
    meta: { key: `${THREAD_OPERATION}/delete-message`, name: 'Delete Message' },
    schema: {
      input: Schema.Struct({
        anchor: AnchoredTo.AnchoredTo,
        subject: EchoObjectSchema,
        messageId: Schema.String,
      }),
      output: DeleteMessageOutput,
    },
  });

  /**
   * Restore a deleted thread (inverse of Delete).
   */
  export const Restore = Operation.make({
    meta: { key: `${THREAD_OPERATION}/restore`, name: 'Restore Thread' },
    schema: {
      input: Schema.Struct({
        thread: Thread.Thread.annotations({ description: 'The thread to restore.' }),
        anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The anchor relation to restore.' }),
      }),
      output: Schema.Void,
    },
  });

  /**
   * Restore a deleted message (inverse of DeleteMessage).
   */
  export const RestoreMessage = Operation.make({
    meta: { key: `${THREAD_OPERATION}/restore-message`, name: 'Restore Message' },
    schema: {
      input: Schema.Struct({
        anchor: AnchoredTo.AnchoredTo.annotations({ description: 'The anchor of the thread.' }),
        message: Message.Message.annotations({ description: 'The message to restore.' }),
        messageIndex: Schema.Number.annotations({ description: 'The index to restore the message at.' }),
      }),
      output: Schema.Void,
    },
  });
}

export const ThreadSettingsSchema = Schema.mutable(Schema.Struct({}));
export type ThreadSettingsProps = Schema.Schema.Type<typeof ThreadSettingsSchema>;

export interface ThreadModel {
  root: Thread.Thread;
}

type SubjectId = string;
export type ViewState = { showResolvedThreads: boolean };
export type ViewStore = Record<SubjectId, ViewState>;

export type ThreadState = {
  /** Object toolbar state. */
  toolbar: Record<string, boolean>;
  /** In-memory draft threads. */
  // TODO(burdon): Drafts are getting lost.
  drafts: Record<string, AnchoredTo.AnchoredTo[]>;
  current?: string | undefined;
};
