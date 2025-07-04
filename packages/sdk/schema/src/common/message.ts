//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { defineObjectMigration } from '@dxos/echo-db';
import { GeneratorAnnotation, ObjectId, TypedObject } from '@dxos/echo-schema';

import { Actor } from './actor';

export const AbstractContentBlock = Schema.Struct({
  pending: Schema.optional(Schema.Boolean),
});

export interface AbstractContentBlock extends Schema.Schema.Type<typeof AbstractContentBlock> {}

/**
 * Text
 */
export const TextContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('text'),
    disposition: Schema.optional(Schema.String), // (e.g., "cot").
    text: Schema.String,
  }),
).pipe(Schema.mutable);

export interface TextContentBlock extends Schema.Schema.Type<typeof TextContentBlock> {}

/**
 * JSON
 */
export const JsonContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('json'),
    disposition: Schema.optional(Schema.String), // (e.g., "tool_use").
    data: Schema.String,
  }),
).pipe(Schema.mutable);

export interface JsonContentBlock extends Schema.Schema.Type<typeof JsonContentBlock> {}

export const Base64ImageSource = Schema.Struct({
  type: Schema.Literal('base64'),
  mediaType: Schema.String,
  data: Schema.String,
}).pipe(Schema.mutable);

export const HttpImageSource = Schema.Struct({
  type: Schema.Literal('http'),
  url: Schema.String,
}).pipe(Schema.mutable);

export const ImageSource = Schema.Union(
  // prettier-ignore
  Base64ImageSource,
  HttpImageSource,
);

/**
 * Image
 */
export const ImageContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('image'),
    id: Schema.optional(Schema.String),
    source: Schema.optional(ImageSource),
  }),
).pipe(Schema.mutable);

export interface ImageContentBlock extends Schema.Schema.Type<typeof ImageContentBlock> {}

/**
 * Reference
 *
 * Non-text content embedded in the message (e.g., files, polls, etc.).
 */
export const ReferenceContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('reference'),
    reference: Type.Ref(Type.Expando),
  }),
).pipe(Schema.mutable);

export interface ReferenceContentBlock extends Schema.Schema.Type<typeof ReferenceContentBlock> {}

/**
 * Transcript
 */
export const TranscriptContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('transcription'), // TODO(burdon): Change to `transcript` (migration?).
    started: Schema.String,
    text: Schema.String,
  }),
).pipe(Schema.mutable);

export interface TranscriptContentBlock extends Schema.Schema.Type<typeof TranscriptContentBlock> {}

export const MessageContentBlock = Schema.Union(
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
const MessageSchema = Schema.Struct({
  id: ObjectId,
  created: Schema.String.pipe(
    Schema.annotations({ description: 'ISO date string when the message was sent.' }),
    GeneratorAnnotation.set('date.iso8601'),
  ),
  sender: Schema.mutable(Actor).pipe(Schema.annotations({ description: 'Identity of the message sender.' })),
  blocks: Schema.mutable(Schema.Array(MessageContentBlock)).annotations({
    description: 'Contents of the message.',
    default: [],
  }),
  properties: Schema.optional(
    Schema.mutable(
      Schema.Record({ key: Schema.String, value: Schema.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
});

export const Message = MessageSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Message',
    version: '0.2.0',
  }),
);

export interface Message extends Schema.Schema.Type<typeof Message> {}

/** @deprecated */
export enum MessageV1State {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

/** @deprecated */
export class MessageV1 extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  timestamp: Schema.String,
  state: Schema.optional(Schema.Enums(MessageV1State)),
  sender: Actor,
  text: Schema.String,
  parts: Schema.optional(Schema.mutable(Schema.Array(Type.Ref(Type.Expando)))),
  properties: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
  context: Schema.optional(Type.Ref(Type.Expando)),
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
