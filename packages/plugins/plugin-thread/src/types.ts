//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type PanelProvides } from '@dxos/plugin-deck/types';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';
import { type SchemaProvides } from '@dxos/plugin-space';
import { ChannelType, MessageType, ThreadType } from '@dxos/plugin-space/types';
import { EchoObjectSchema } from '@dxos/react-client/echo';

import { THREAD_PLUGIN } from './meta';

export namespace ThreadAction {
  const THREAD_ACTION = `${THREAD_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${THREAD_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
      cursor: S.optional(S.String),
      subject: S.optional(EchoObjectSchema),
    }),
    output: S.Struct({
      object: S.Union(ChannelType, ThreadType),
    }),
  }) {}

  export class Select extends S.TaggedClass<Select>()(`${THREAD_ACTION}/select`, {
    input: S.Struct({
      current: S.String,
      skipOpen: S.optional(S.Boolean),
    }),
    output: S.Void,
  }) {}

  export class ToggleResolved extends S.TaggedClass<ToggleResolved>()(`${THREAD_ACTION}/toggle-resolved`, {
    input: S.Struct({
      thread: ThreadType,
    }),
    output: S.Void,
  }) {}

  export class Delete extends S.TaggedClass<Delete>()(`${THREAD_ACTION}/delete`, {
    input: S.Struct({
      thread: ThreadType,
      subject: EchoObjectSchema,
      cursor: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  // TODO(wittjosiah): Rename?
  export class OnMessageAdd extends S.TaggedClass<OnMessageAdd>()(`${THREAD_ACTION}/on-message-add`, {
    input: S.Struct({
      thread: ThreadType,
      subject: EchoObjectSchema,
    }),
    output: S.Void,
  }) {}

  export class DeleteMessage extends S.TaggedClass<DeleteMessage>()(`${THREAD_ACTION}/delete-message`, {
    input: S.Struct({
      thread: ThreadType,
      subject: EchoObjectSchema,
      messageId: S.String,
      message: S.optional(MessageType),
      messageIndex: S.optional(S.Number),
    }),
    output: S.Void,
  }) {}
}

// TODO(Zan): Move this to the plugin-space plugin or another common location when we implement threads in sheets.
export type ThreadProvides<T> = {
  thread: {
    predicate: (obj: any) => obj is T;
    createSort: (obj: T) => (anchorA: string | undefined, anchorB: string | undefined) => number;
  };
};

export type ThreadPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<ThreadSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  PanelProvides &
  MarkdownExtensionProvides;

export type ThreadSettingsProps = { standalone?: boolean };

export interface ThreadModel {
  root: ThreadType;
}

export type ThreadState = {
  /** In-memory draft threads. */
  drafts: Record<string, ThreadType[]>;
  current?: string | undefined;
};
