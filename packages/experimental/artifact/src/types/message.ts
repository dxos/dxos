//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { EchoObject, ObjectId, SpaceIdSchema } from '@dxos/echo-schema';
import { type SpaceId } from '@dxos/keys';

// TODO(dmaretskyi): Extract IDs to protocols.
// TODO(dmaretskyi): Dedupe package with dxos/edge.

/** @deprecated */
export const Space = S.Struct({
  id: SpaceIdSchema,
});
/** @deprecated */
export interface Space extends S.Schema.Type<typeof Space> {}

/** @deprecated */
export const Thread = S.Struct({
  id: ObjectId,
  spaceId: SpaceIdSchema,
});
/** @deprecated */
export interface Thread extends S.Schema.Type<typeof Thread> {}

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
    disposition: S.optional(S.String),
    json: S.String,
  }),
).pipe(S.mutable);
export type JsonContentBlock = S.Schema.Type<typeof JsonContentBlock>;

export const ImageSource = S.Struct({
  type: S.Literal('base64'),
  mediaType: S.String,
  data: S.String,
}).pipe(S.mutable);

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
 * Tool use.
 */
export const ToolUseContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
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

    /**
     * Input parameters.
     */
    input: S.Unknown,
  }),
).pipe(S.mutable);

export const ToolResultContentBlock = S.extend(
  AbstractContentBlock,
  S.Struct({
    type: S.Literal('tool_result'),
    toolUseId: S.String,
    content: S.String,
    isError: S.optional(S.Boolean), // TODO(burdon): Change to error string.
  }),
).pipe(S.mutable);

/**
 * Content union.
 */
export const MessageContentBlock = S.Union(
  TextContentBlock,
  JsonContentBlock,
  ImageContentBlock,

  // TODO(burdon): Replace with JsonContentBlock with disposition (to make MessageContentBlock reusable).
  ToolUseContentBlock,
  ToolResultContentBlock,
);

export type MessageContentBlock = S.Schema.Type<typeof MessageContentBlock>;

export const MessageRole = S.String.pipe(S.filter((role) => role === 'user' || role === 'assistant'));
export type MessageRole = S.Schema.Type<typeof MessageRole>;

/**
 * Message.
 */
const MessageSchema = S.Struct({
  id: ObjectId,

  role: MessageRole,

  /**
   * Content blocks.
   */
  // TODO(burdon): Rename to blocks.
  content: S.Array(MessageContentBlock).pipe(S.mutable),
});

/**
 * @deprecated
 */
// TODO(burdon): Reconcile with Chat/Message types?
export const Message = MessageSchema.pipe(EchoObject({ typename: 'dxos.org/type/Message', version: '0.1.0' }));
export type Message = S.Schema.Type<typeof Message>;

export const createUserMessage = (spaceId: SpaceId, threadId: ObjectId, text: string): Message => ({
  id: ObjectId.random(),
  role: 'user',
  content: [{ type: 'text', text }],
});
