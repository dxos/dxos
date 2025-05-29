//
// Copyright 2023 DXOS.org
//

import { Ref, Schema } from 'effect';

import { Type } from '@dxos/echo';
import { ChannelType, ThreadType } from '@dxos/plugin-space/types';
import { EchoObjectSchema } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { THREAD_PLUGIN } from './meta';
import { EchoObject } from '@dxos/echo-schema';

export namespace ThreadAction {
  const THREAD_ACTION = `${THREAD_PLUGIN}/action`;

  export class CreateChannel extends Schema.TaggedClass<CreateChannel>()(`${THREAD_ACTION}/create-channel`, {
    input: Schema.Struct({
      spaceId: Type.SpaceId,
      name: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: ChannelType,
    }),
  }) {}

  export class Create extends Schema.TaggedClass<Create>()(`${THREAD_ACTION}/create`, {
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      cursor: Schema.String,
      subject: EchoObjectSchema,
    }),
    output: Schema.Struct({
      object: ThreadType,
    }),
  }) {}

  export class Delete extends Schema.TaggedClass<Delete>()(`${THREAD_ACTION}/delete`, {
    input: Schema.Struct({
      thread: ThreadType,
      subject: EchoObjectSchema,
      cursor: Schema.optional(Schema.String),
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
      thread: ThreadType,
      sender: DataType.Actor,
      text: Schema.String,
    }),
    output: Schema.Void,
  }) {}

  export class DeleteMessage extends Schema.TaggedClass<DeleteMessage>()(`${THREAD_ACTION}/delete-message`, {
    input: Schema.Struct({
      thread: ThreadType,
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
  /** Current channel activity. */
  activities: Record<string, string | undefined>;
  /** In-memory draft threads. */
  drafts: Record<string, ThreadType[]>;
  current?: string | undefined;
};

const Channel = Schema.Struct({
  name: Schema.String,
  messages: Ref(MessageList),
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/Channel',
    version: '0.1.0',
  }),
);

const Thread = Schema.Struct({
  messages: Schema.Array(Ref(Thread)),
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/MessageList',
    version: '0.1.0',
  }),
);

const Message = Schema.Struct({
  text: Schema.String,
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/Message',
    version: '0.1.0',
  }),
);

type Ref<T> = { target: T; url: string };

/////////////////////

type Root = {
  pages: Ref<Page>[];
};

type Page = {
  messages: Ref<Message>[];
};

type Message = {
  text: string;
};

/////////////////////

function forEach(root: Root, fn: (message: Message) => void) {
  const pages = root.pages;
  for (const page of pages) {
    const messages = page.target.messages;
    for (const message of messages) {
      fn(message.target);
    }
  }
}

function getNth(root: Root, n: number) {}

function getByPath(root: Root, path: number[]) {}

///

type AutomergeUrl = string;

type SpaceDirectory = {
  pages: {
    [radix: string]: AutomergeUrl;
  };
};

type SpaceDirectoryPage = {
  links: {
    [echoId: string]: AutomergeUrl;
  };
};

