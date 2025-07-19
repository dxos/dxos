//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Type } from '@dxos/echo';

import { AgentStatusReport } from '../status-report';

// TODO(dmaretskyi): Extract IDs to protocols and dedupe package with dxos/edge.

/**
 * @internal
 * @deprecated
 */
export const Space = Schema.Struct({
  id: Type.SpaceId,
});
/**
 * @internal
 * @deprecated
 */
export interface Space extends Schema.Schema.Type<typeof Space> {}

/**
 * @internal
 * @deprecated
 */
export const Thread = Schema.Struct({
  id: Type.ObjectId,
  spaceId: Type.SpaceId,
});
/**
 * @internal
 * @deprecated
 */
export interface Thread extends Schema.Schema.Type<typeof Thread> {}

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
    disposition: Schema.optional(Schema.String),
    json: Schema.String,
  }),
).pipe(Schema.mutable);
export interface JsonContentBlock extends Schema.Schema.Type<typeof JsonContentBlock> {}

export const ImageSource = Schema.Struct({
  type: Schema.Literal('base64'),
  mediaType: Schema.String,
  data: Schema.String,
}).pipe(Schema.mutable);

export interface ImageSource extends Schema.Schema.Type<typeof ImageSource> {}

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
 * Tool use.
 */
export const ToolUseContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('tool_use'),

    /**
     * Opaque service-defined ID of the tool invocation.
     * Used to match the tool result block.
     */
    id: Schema.String,

    /**
     * Tool name.
     */
    name: Schema.String,

    /**
     * Input parameters.
     */
    input: Schema.Unknown,

    /**
     * Ephemeral status message.
     */
    currentStatus: Schema.optional(AgentStatusReport),
  }),
).pipe(Schema.mutable);
export interface ToolUseContentBlock extends Schema.Schema.Type<typeof ToolUseContentBlock> {}

export const ToolResultContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('tool_result'),
    toolUseId: Schema.String,
    content: Schema.String,
    isError: Schema.optional(Schema.Boolean), // TODO(burdon): Change to error string.
  }),
).pipe(Schema.mutable);
export interface ToolResultContentBlock extends Schema.Schema.Type<typeof ToolResultContentBlock> {}

/**
 * Content union.
 */
export const MessageContentBlock = Schema.Union(
  TextContentBlock,
  JsonContentBlock,
  ImageContentBlock,

  // TODO(burdon): Replace with JsonContentBlock with disposition (to make MessageContentBlock reusable).
  ToolUseContentBlock,
  ToolResultContentBlock,
);

export type MessageContentBlock = Schema.Schema.Type<typeof MessageContentBlock>;

export const MessageRole = Schema.String.pipe(Schema.filter((role) => role === 'user' || role === 'assistant'));
export type MessageRole = Schema.Schema.Type<typeof MessageRole>;

/**
 * Message.
 */
const MessageSchema = Schema.Struct({
  id: Type.ObjectId,

  role: MessageRole,

  /**
   * Content blocks.
   */
  // TODO(burdon): Rename to blocks.
  content: Schema.Array(MessageContentBlock).pipe(Schema.mutable),
});

/**
 * @deprecated
 */
// TODO(burdon): Reconcile with Chat/Message types?
export const Message = MessageSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Message',
    version: '0.1.0',
  }),
);
/**
 * @deprecated
 */
export type Message = Schema.Schema.Type<typeof Message>;

export const createUserMessage = (spaceId: Type.SpaceId, threadId: Type.ObjectId, text: string): Message =>
  Obj.make(Message, {
    role: 'user',
    content: [{ type: 'text', text }],
  });
