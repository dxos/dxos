//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TextV0Schema, type MarkdownExtensionProvides } from '@braneframe/plugin-markdown';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import * as E from '@dxos/echo-schema';

import { THREAD_PLUGIN } from './meta';

const THREAD_ACTION = `${THREAD_PLUGIN}/action`;
export enum ThreadAction {
  CREATE = `${THREAD_ACTION}/create`,
  SELECT = `${THREAD_ACTION}/select`,
  DELETE = `${THREAD_ACTION}/delete`,
}

export type ThreadPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides &
  TranslationsProvides &
  MarkdownExtensionProvides;

export type ThreadSettingsProps = { standalone?: boolean };

export interface ThreadModel {
  root: ThreadType;
}

const _RecipientSchema = S.struct({
  identityKey: S.optional(S.string),
  email: S.optional(S.string),
  name: S.optional(S.string),
});

const _BlockSchema = S.struct({
  timestamp: S.string,
  content: S.optional(E.ref(TextV0Schema)),
  object: S.optional(E.ref(E.AnyEchoObject)),
});
export interface BlockType extends S.Schema.To<typeof _BlockSchema> {}

const _MessageSchema = S.struct({
  type: S.optional(S.string),
  date: S.optional(S.string),
  from: _RecipientSchema,
  to: S.optional(S.array(_RecipientSchema)),
  cc: S.optional(S.array(_RecipientSchema)),
  subject: S.optional(S.string),
  blocks: S.array(_BlockSchema),
  links: S.optional(S.array(E.ref(E.AnyEchoObject))),
  state: S.optional(S.string),
  read: S.optional(S.boolean),
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}).pipe(E.echoObject('braneframe.Message', '0.1.0'));
export interface MessageType extends E.ObjectType<typeof _MessageSchema> {}
export const MessageSchema: S.Schema<MessageType> = _MessageSchema;

const _ThreadSchema = S.struct({
  title: S.optional(S.string),
  messages: S.array(E.ref(_MessageSchema)),
  // TODO(burdon): Reconcile with Message.Context.
  context: S.optional(
    S.struct({
      space: S.optional(S.string),
      schema: S.optional(S.string),
      object: S.optional(S.string),
    }),
  ),
}).pipe(E.echoObject('braneframe.Thread', '0.1.0'));
export interface ThreadType extends E.ObjectType<typeof _ThreadSchema> {}
export const ThreadSchema: S.Schema<ThreadType> = _ThreadSchema;

export const isThread = (data: unknown): data is E.EchoReactiveObject<ThreadType> =>
  !!data && E.getSchema<any>(data) === ThreadSchema;
