//
// Copyright 2025 DXOS.org
//

import { defineObjectMigration } from '@dxos/echo-db';
import { Expando, ObjectId, Ref, S, TypedObject } from '@dxos/echo-schema';

import { ActorSchema } from './actor';

export const AbstractContentBlock = S.Struct({
  pending: S.optional(S.Boolean),
});
export type AbstractContentBlock = S.Schema.Type<typeof AbstractContentBlock>;

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
export type TextContentBlock = S.Schema.Type<typeof TextContentBlock>;

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
export type JsonContentBlock = S.Schema.Type<typeof JsonContentBlock>;

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
export type ImageSource = S.Schema.Type<typeof ImageSource>;

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
export type ImageContentBlock = S.Schema.Type<typeof ImageContentBlock>;

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
export type ReferenceContentBlock = S.Schema.Type<typeof ReferenceContentBlock>;

/**
 * Transcription
 */
export const TranscriptionContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('transcription'),
    // TODO(burdon): TS from service is not Unix TS (x1000).
    started: S.String,
    text: S.String,
  }),
).pipe(S.mutable);
export type TranscriptionContentBlock = S.Schema.Type<typeof TranscriptionContentBlock>;

export const MessageContentBlock = S.Union(
  TextContentBlock,
  JsonContentBlock,
  ImageContentBlock,
  ReferenceContentBlock,
  TranscriptionContentBlock,
);

/**
 * Message.
 */
// TODO(wittjosiah): Using `EchoObject` here causes type errors.
// TODO(wittjosiah): Add read status:
//  - Read receipts need to be per space member.
//  - Read receipts don't need to be added to schema until they being implemented.
export class Message extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.2.0' })({
  id: ObjectId,
  created: S.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: S.mutable(ActorSchema).annotations({
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
}) {}

enum MessageV1State {
  NONE = 0,
  ARCHIVED = 1,
  DELETED = 2,
  SPAM = 3,
}

export class MessageV1 extends TypedObject({ typename: 'dxos.org/type/Message', version: '0.1.0' })({
  timestamp: S.String,
  state: S.optional(S.Enums(MessageV1State)),
  sender: ActorSchema,
  text: S.String,
  parts: S.optional(S.mutable(S.Array(Ref(Expando)))),
  properties: S.optional(S.mutable(S.Record({ key: S.String, value: S.Any }))),
  context: S.optional(Ref(Expando)),
}) {}

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
