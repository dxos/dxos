//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { defineObjectMigration } from '@dxos/echo-db';
import { GeneratorAnnotation, ObjectId, TypedObject } from '@dxos/echo-schema';

import { Actor } from './actor';

// TODO(dmaretskyi): Consider renaming it to Part.
export namespace ContentBlock {
  export const Base = Schema.Struct({
    /**
     * In streaming mode, this is set to `true` when the block is not complete.
     */
    pending: Schema.optional(Schema.Boolean),
  });
  export interface Base extends Schema.Schema.Type<typeof Base> {}

  /**
   * Text
   */
  export const Text = Schema.TaggedStruct('text', {
    mimeType: Schema.optional(Schema.String),
    text: Schema.String,

    /**
     * @deprecated
     */
    disposition: Schema.optional(Schema.String), // (e.g., "cot").

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Text extends Schema.Schema.Type<typeof Text> {}

  /**
   * Represents part of the reasoning carried out by the model to generate a
   * response.
   */
  export const Reasoning = Schema.TaggedStruct('reasoning', {
    /**
     * The reasoning content that the model used to return the output.
     */
    reasoningText: Schema.optional(Schema.String),

    /**
     * The content in the reasoning that was encrypted by the model provider for
     * safety reasons.
     */
    redactedText: Schema.optional(Schema.String),

    /**
     * An optional signature which verifies that the reasoning text was generated
     * by the model.
     */
    signature: Schema.optional(Schema.String),

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Reasoning extends Schema.Schema.Type<typeof Reasoning> {}

  /**
   * Represents a tool call made by the model.
   */
  export const ToolCall = Schema.TaggedStruct('toolCall', {
    /**
     * Id unique to this tool call.
     * Set by the model provider.
     */
    toolCallId: Schema.String,

    /**
     * The name of the tool that was called.
     */
    name: Schema.String,

    // TODO(dmaretskyi): We might need to be able to reprsent partial json.
    /**
     * Parsed input of the tool call.
     */
    input: Schema.Unknown,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface ToolCall extends Schema.Schema.Type<typeof ToolCall> {}

  export const ToolResult = Schema.TaggedStruct('toolResult', {
    /**
     * Id of the tool call that this result is for.
     * Must match the Id of the preceding {@link ToolCallContentBlock}.
     */
    toolCallId: Schema.String,

    /**
     * The name of the tool that was called.
     */
    name: Schema.String,

    /**
     * The result of the tool call.
     */
    result: Schema.Unknown,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface ToolResult extends Schema.Schema.Type<typeof ToolResult> {}

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
  export const Image = Schema.TaggedStruct('image', {
    id: Schema.optional(Schema.String),
    source: Schema.optional(ImageSource),

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Image extends Schema.Schema.Type<typeof Image> {}

  export const File = Schema.TaggedStruct('file', {
    /**
     * The URL of the file.
     * Data URLs allow for embedding small files directly in the message.
     */
    url: Schema.String,

    /**
     * The name of the file.
     */
    name: Schema.optional(Schema.String),

    /**
     * The MIME type of the file.
     */
    mediaType: Schema.optional(Schema.String),

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface File extends Schema.Schema.Type<typeof File> {}

  /**
   * Reference
   *
   * Non-text content embedded in the message (e.g., files, polls, etc.).
   */
  export const Reference = Schema.TaggedStruct('reference', {
    reference: Type.Ref(Type.Expando),

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Reference extends Schema.Schema.Type<typeof Reference> {}

  /**
   * Transcript block.
   */
  export const Transcript = Schema.TaggedStruct('transcript', {
    started: Schema.String,
    text: Schema.String,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Transcript extends Schema.Schema.Type<typeof Transcript> {}

  /**
   * Agent reporting it's current status.
   */
  export const Status = Schema.TaggedStruct('status', {
    statusText: Schema.String,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Status extends Schema.Schema.Type<typeof Status> {}

  /**
   * Suggestion for a follow-up prompt for the user.
   */
  // TODO(burdon): Rename Suggestion.
  export const Suggest = Schema.TaggedStruct('suggest', {
    text: Schema.String,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Suggest extends Schema.Schema.Type<typeof Suggest> {}

  /**
   * Multiple choice selection.
   * Usually an answer to assistant's question.
   */
  // TODO(burdon): Rename Choice.
  export const Select = Schema.TaggedStruct('select', {
    options: Schema.Array(Schema.String),

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Select extends Schema.Schema.Type<typeof Select> {}

  /**
   * Associates artifact (of a specific version) with this conversation.
   * Used to track associated artifacts as well their changes during the conversation.
   */
  // TODO(dmaretskyi): What's the relation of this to the reference content block?
  const Anchor = Schema.TaggedStruct('anchor', {
    // TODO(dmaretskyi): Consider making this a DXN.
    objectId: ObjectId,

    // TODO(dmaretskyi): Better type.
    version: Schema.Unknown,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Anchor extends Schema.Schema.Type<typeof Anchor> {}

  /**
   * Proposed content to be added to an artifact.
   */
  // TODO(dmaretskyi): Consider handling this via a tool call.
  export const Proposal = Schema.TaggedStruct('proposal', {
    text: Schema.String,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Proposal extends Schema.Schema.Type<typeof Proposal> {}

  /**
   * Model printing info about the list of available tools.
   */
  // TODO(burdon): Rename Toolkit.
  export const ToolList = Schema.TaggedStruct('toolList', {
    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface ToolList extends Schema.Schema.Type<typeof ToolList> {}

  /**
   * JSON
   * @deprecated Use {@link Text} with mime type of `application/json`.
   */
  export const Json = Schema.TaggedStruct('json', {
    disposition: Schema.optional(Schema.String), // (e.g., "tool_use").
    data: Schema.String,

    ...Base.fields,
  }).pipe(Schema.mutable);
  export interface Json extends Schema.Schema.Type<typeof Json> {}

  export const Any = Schema.Union(
    Anchor,
    File,
    Image,
    Json,
    Proposal,
    Reasoning,
    Reference,
    Select,
    Status,
    Suggest,
    Text,
    ToolCall,
    ToolList,
    ToolResult,
    Transcript,
  );
  export type Any = Schema.Schema.Type<typeof Any>;
}

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
  blocks: Schema.mutable(Schema.Array(ContentBlock.Any)).annotations({
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
        { _tag: 'text' as const, text: from.text },
        ...(from.parts ?? []).map((part) => ({ _tag: 'reference' as const, reference: part })),
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
