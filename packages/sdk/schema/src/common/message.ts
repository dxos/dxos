//
// Copyright 2025 DXOS.org
//

import { EchoObject, Expando, ObjectId, Ref, S } from '@dxos/echo-schema';

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

export const MessageContentBlock = S.Union(
  // prettier-ignore
  TextContentBlock,
  JsonContentBlock,
  ImageContentBlock,
);

// TODO(wittjosiah): Add read status:
//  - Read receipts need to be per space member.
//  - Read receipts don't need to be added to schema until they being implemented.
/**
 * Message.
 */
export const MessageType = S.Struct({
  id: ObjectId,
  created: S.String.annotations({
    description: 'ISO date string when the message was sent.',
  }),
  sender: ActorSchema.annotations({
    description: 'Identity of the message sender.',
  }),
  blocks: S.Array(MessageContentBlock).annotations({
    description: 'Inline content of the message.',
  }),
  attachments: S.optional(
    S.mutable(
      Ref(Expando).annotations({
        description: 'Non-text content embedded in the message (e.g., files, polls, etc.)',
      }),
    ),
  ),
  properties: S.optional(
    S.mutable(
      S.Record({ key: S.String, value: S.Any }).annotations({
        description: 'Custom properties for specific message types (e.g. attention context, email subject, etc.).',
      }),
    ),
  ),
}).pipe(EchoObject('dxos.org/type/Message', '0.1.0'));
export type MessageType = S.Schema.Type<typeof MessageType>;
