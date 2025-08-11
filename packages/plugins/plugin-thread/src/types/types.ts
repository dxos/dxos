//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { EchoObjectSchema, SpaceSchema } from '@dxos/react-client/echo';
import { AnchoredTo, DataType } from '@dxos/schema';

import { THREAD_PLUGIN } from '../meta';

import { ChannelType, ThreadType } from './schema';

export namespace ThreadAction {
  const THREAD_ACTION = `${THREAD_PLUGIN}/action`;

  export class OnSpaceCreated extends Schema.TaggedClass<OnSpaceCreated>()(`${THREAD_ACTION}/on-space-created`, {
    input: Schema.Struct({
      space: SpaceSchema,
      rootCollection: DataType.Collection,
    }),
    output: Schema.Void,
  }) {}

  export class CreateChannel extends Schema.TaggedClass<CreateChannel>()(`${THREAD_ACTION}/create-channel`, {
    input: Schema.Struct({
      spaceId: Type.SpaceId,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ChannelType,
    }),
  }) {}

  export class CreateChannelThread extends Schema.TaggedClass<CreateChannelThread>()(
    `${THREAD_ACTION}/create-channel-thread`,
    {
      input: Schema.Struct({
        channel: ChannelType,
      }),
      output: Schema.Struct({
        object: ThreadType,
      }),
    },
  ) {}

  export class Create extends Schema.TaggedClass<Create>()(`${THREAD_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      anchor: Schema.optional(Schema.String),
      subject: EchoObjectSchema,
    }),
    output: Schema.Void,
  }) {}

  export class Delete extends Schema.TaggedClass<Delete>()(`${THREAD_ACTION}/delete`, {
    input: Schema.Struct({
      anchor: AnchoredTo,
      subject: EchoObjectSchema,
      thread: Schema.optional(ThreadType),
    }),
    output: Schema.Void,
  }) {}

  export class Select extends Schema.TaggedClass<Select>()(`${THREAD_ACTION}/select`, {
    input: Schema.Struct({
      current: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class ToggleResolved extends Schema.TaggedClass<ToggleResolved>()(`${THREAD_ACTION}/toggle-resolved`, {
    input: Schema.Struct({
      thread: ThreadType,
    }),
    output: Schema.Void,
  }) {}

  export class AddMessage extends Schema.TaggedClass<AddMessage>()(`${THREAD_ACTION}/add-message`, {
    input: Schema.Struct({
      subject: EchoObjectSchema,
      anchor: AnchoredTo,
      sender: DataType.Actor,
      text: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class DeleteMessage extends Schema.TaggedClass<DeleteMessage>()(`${THREAD_ACTION}/delete-message`, {
    input: Schema.Struct({
      anchor: AnchoredTo,
      subject: EchoObjectSchema,
      messageId: Schema.String,
      message: Schema.optional(DataType.Message),
      messageIndex: Schema.optional(Schema.Number),
    }),
    output: Schema.Void,
  }) {}
}

export const ThreadSettingsSchema = Schema.mutable(Schema.Struct({}));
export type ThreadSettingsProps = Schema.Schema.Type<typeof ThreadSettingsSchema>;

export interface ThreadModel {
  root: ThreadType;
}

type SubjectId = string;
export type ViewState = { showResolvedThreads: boolean };
export type ViewStore = Record<SubjectId, ViewState>;

export type ThreadState = {
  /** Object toolbar state. */
  toolbar: Record<string, boolean>;
  /** In-memory draft threads. */
  drafts: Record<string, AnchoredTo[]>;
  current?: string | undefined;
};
