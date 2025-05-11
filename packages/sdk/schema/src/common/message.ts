//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { defineObjectMigration } from '@dxos/echo-db';
import { Expando, ObjectIdSchema, Ref, S, TypedObject } from '@dxos/echo-schema';

import { Actor } from './actor';

export const AbstractContentBlock = S.Struct({
  pending: S.optional(S.Boolean),
});
export interface AbstractContentBlock extends S.Schema.Type<typeof AbstractContentBlock> {}

/**
 * Text
 */
export const TextContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('text'),
    disposition: S.optional(S.String), // (e.g., "cot").
    text: S.String,
  }),
).pipe(S.mutable);
export interface TextContentBlock extends S.Schema.Type<typeof TextContentBlock> {}

/**
 * JSON
 */
export const JsonContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('json'),
    disposition: S.optional(S.String), // (e.g., "tool_use").
    data: S.String,
  }),
).pipe(S.mutable);
export interface JsonContentBlock extends S.Schema.Type<typeof JsonContentBlock> {}

export const Base64ImageSource = S.Struct({
  type: S.Literal('base64'),
  mediaType: S.String,
  data: S.String,
}).pipe(S.mutable);

export const HttpImageSource = S.Struct({
  type: S.Literal('http'),
  url: S.String,
}).pipe(S.mutable);

export const ImageSource = S.Union(
  // prettier-ignore
  Base64ImageSource,
  HttpImageSource,
);

/**
 * Image
 */
export const ImageContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('image'),
    id: S.optional(S.String),
    source: S.optional(ImageSource),
  }),
).pipe(S.mutable);
export interface ImageContentBlock extends S.Schema.Type<typeof ImageContentBlock> {}

/**
 * Reference
 *
 * Non-text content embedded in the message (e.g., files, polls, etc.).
 */
export const ReferenceContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('reference'),
    reference: Ref(Expando),
  }),
).pipe(S.mutable);
export interface ReferenceContentBlock extends S.Schema.Type<typeof ReferenceContentBlock> {}

/**
 * Transcript
 */
export const TranscriptContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('transcription'), // TODO(burdon): Change to `transcript` (migration?).
    started: S.String,
    text: S.String,
  }),
).pipe(S.mutable);
export interface TranscriptContentBlock extends S.Schema.Type<typeof TranscriptContentBlock> {}

export const MessageContentBlock = S.Union(
  TextContentBlock,
  JsonContentBlock,
  ImageContentBlock,
  ReferenceContentBlock,
  TranscriptContentBlock,
);

/**
 * Message.
 */
// TODO(wittjosiah): Add read status:
//  - Read receipts need to be per space member.
//  - Read receipts don't need to be added to schema until they being implemented.
const MessageSchema = S.Struct({
  id: ObjectIdSchema,
  created: S.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: S.mutable(Actor).annotations({
    description: 'Identity of the message sender.',
  }),
  blocks: S.mutable(S.Array(MessageContentBlock)).annotations({
    description: 'Contents of the message.',
  }),
  properties: S.optional(
    S.mutable(
      S.Record({ key: S.String, value: S.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
});

export const Message = MessageSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Message',
    version: '0.2.0',
  }),
);
export interface Message extends S.Schema.Type<typeof Message> {}

/** @deprecated */
export enum MessageV1State {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/** @deprecated */
export class MessageV1 extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  timestamp: S.String,
  state: S.optional(S.Enums(MessageV1State)),
  sender: Actor,
  text: S.String,
  parts: S.optional(S.mutable(S.Array(Ref(Expando)))),
  properties: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
  context: S.optional(Ref(Expando)),
}) {}

/** @deprecated */
export const MessageV1ToV2 = defineObjectMigration({
  from: MessageV1,
  to: Message,
  transform: async (from) => {
    return {
      id: from.id,
      created: from.timestamp,
      sender: from.sender,
      blocks: [
        { type: 'text' as const, text: from.text },
        ...(from.parts ?? []).map((part) => ({ type: 'reference' as const, reference: part })),
      ],
      properties: {
        ...from.properties,
        state: from.state,
        context: from.context,
      },
    };
  },
  onMigration: async () => {},
});
