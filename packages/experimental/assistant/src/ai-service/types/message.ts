//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { EchoObject, ObjectId } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';

// TODO(dmaretskyi): Dedupe package with dxos/edge.
// TODO(dmaretskyi): Extract IDs to protocols.

export const SpaceIdSchema: S.Schema<SpaceId, string> = S.String.pipe(S.filter(SpaceId.isValid));

export const Space = S.Struct({
  id: SpaceIdSchema,
});

export interface Space extends S.Schema.Type<typeof Space> {}

/**
 * Thread.
 */
export const Thread = S.Struct({
  id: ObjectId,
  spaceId: SpaceIdSchema,
});

export interface Thread extends S.Schema.Type<typeof Thread> {}

export const MessageRole = S.String.pipe(S.filter((role) => role === 'user' || role === 'assistant'));
export type MessageRole = S.Schema.Type<typeof MessageRole>;

/**
 * Tagged block.
 */
export const TagContentBlock = S.Struct({
  type: S.Literal('tag'),
  tag: S.String,
  text: S.String,
}).pipe(S.mutable);

export type TagContentBlock = S.Schema.Type<typeof TagContentBlock>;

/**
 * Text.
 */
export const TextContentBlock = S.Struct({
  type: S.Literal('text'),
  text: S.String,
}).pipe(S.mutable);

export type TextContentBlock = S.Schema.Type<typeof TextContentBlock>;

/**
 * Image.
 */
export const ImageSource = S.Struct({
  type: S.Literal('base64'),
  media_type: S.Literal('image/jpeg', 'image/png', 'image/gif', 'image/webp'),
  data: S.String,
}).pipe(S.mutable);

export type ImageSource = S.Schema.Type<typeof ImageSource>;

export const ImageContentBlock = S.Struct({
  type: S.Literal('image'),
  id: S.optional(S.String),
  source: S.optional(ImageSource),
}).pipe(S.mutable);

export type ImageContentBlock = S.Schema.Type<typeof ImageContentBlock>;

/**
 * Tool use.
 */
export const ToolUseContentBlock = S.Struct({
  type: S.Literal('tool_use'),

  /**
   * Opaque service-defined ID of the tool invocation.
   * Used to match the tool result block.
   */
  id: S.String,

  /**
   * Tool name.
   */
  name: S.String,

  input: S.Unknown,

  /**
   * Used to accumulate the partial tool input JSON in streaming mode.
   */
  // TODO(burdon): Remove?
  inputJson: S.optional(S.String),
}).pipe(S.mutable);

export const ToolResultContentBlock = S.Struct({
  type: S.Literal('tool_result'),
  toolUseId: S.String,
  content: S.String,
  isError: S.optional(S.Boolean),
});

/**
 * Content union.
 */
export const MessageContentBlock = S.Union(
  TagContentBlock,
  TextContentBlock,
  ImageContentBlock,
  ToolUseContentBlock,
  ToolResultContentBlock,
);

export type MessageContentBlock = S.Schema.Type<typeof MessageContentBlock>;

/**
 * Message.
 */
const MessageSchema = S.Struct({
  id: ObjectId,
  threadId: S.optional(ObjectId),
  spaceId: S.optional(SpaceIdSchema),

  /**
   * ID of the message from the foreign provider.
   */
  // TODO(dmaretskyi): Should be in meta/keys.
  foreignId: S.optional(S.String),

  // TODO(dmaretskyi): Figure out how to deal with those.
  // created: S.optional(S.DateFromString),
  // updated: S.optional(S.DateFromString),

  role: MessageRole,

  // TODO(burdon): Rename blocks?
  content: S.Array(MessageContentBlock).pipe(S.mutable),
});

// TODO(burdon): Reconcile with Chat/Message types.
export const Message = MessageSchema.pipe(EchoObject('dxos.org/type/Message', '0.1.0'));

export type Message = S.Schema.Type<typeof Message>;
