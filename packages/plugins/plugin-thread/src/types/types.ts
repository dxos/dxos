//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { EchoObjectSchema, SpaceSchema } from '@dxos/react-client/echo';
import { AnchoredTo, DataType } from '@dxos/schema';

import { meta } from '../meta';

import { ChannelType, ThreadType } from './schema';

export namespace ThreadAction {
  export class OnSpaceCreated extends Schema.TaggedClass<OnSpaceCreated>()(`${meta.id}/action/on-space-created`, {
    input: Schema.Struct({
      space: SpaceSchema,
      rootCollection: DataType.Collection,
    }),
    output: Schema.Void,
  }) {}

  export class CreateChannel extends Schema.TaggedClass<CreateChannel>()(`${meta.id}/action/create-channel`, {
    input: Schema.Struct({
      spaceId: Type.SpaceId,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ChannelType,
    }),
  }) {}

  export class CreateChannelThread extends Schema.TaggedClass<CreateChannelThread>()(
    `${meta.id}/action/create-channel-thread`,
    {
      input: Schema.Struct({
        channel: ChannelType,
      }),
      output: Schema.Struct({
        object: ThreadType,
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
      anchor: AnchoredTo,
      subject: EchoObjectSchema,
      thread: Schema.optional(ThreadType),
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
      thread: ThreadType,
    }),
    output: Schema.Void,
  }) {}

  export class AddProposal extends Schema.TaggedClass<AddProposal>()(`${meta.id}/action/add-proposal`, {
    input: Schema.Struct({
      text: Schema.String,
      anchor: Schema.String,
      sender: DataType.Actor,
      subject: EchoObjectSchema,
    }),
    output: Schema.Void,
  }) {}

  export class AddMessage extends Schema.TaggedClass<AddMessage>()(`${meta.id}/action/add-message`, {
    input: Schema.Struct({
      subject: EchoObjectSchema,
      anchor: AnchoredTo,
      sender: DataType.Actor,
      text: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class DeleteMessage extends Schema.TaggedClass<DeleteMessage>()(`${meta.id}/action/delete-message`, {
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
