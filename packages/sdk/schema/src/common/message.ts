//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { defineObjectMigration } from '@dxos/echo-db';
import { GeneratorAnnotation, ObjectId, TypedObject } from '@dxos/echo-schema';

import { Actor } from './actor';

// TODO(dmaretskyi): Namespace (e.g. ContentBlock.Text).
// TODO(dmaretskyi): Consider renaming it to Part.

export const AbstractContentBlock = Schema.Struct({
  /**
   * In streaming mode, this is set to `true` when the block is not complete.
   */
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

    mimeType: Schema.optional(Schema.String),
    text: Schema.String,

    /**
     * @deprecated
     */
    disposition: Schema.optional(Schema.String), // (e.g., "cot").
  }),
).pipe(Schema.mutable);
export interface TextContentBlock extends Schema.Schema.Type<typeof TextContentBlock> {}

/**
 * Represents part of the reasoning carried out by the model to generate a
 * response.
 */
export const ReasoningContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('reasoning'),

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
  }),
).pipe(Schema.mutable);

/**
 * Represents a tool call made by the model.
 */
export const ToolCallContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('toolCall'),

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
  }),
).pipe(Schema.mutable);
export interface ToolCallContentBlock extends Schema.Schema.Type<typeof ToolCallContentBlock> {}

export const ToolResultContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('toolResult'),

    /**
     * Id of the tool call that this result is for.
     * Must match the Id of the preceding {@link ToolCallContentBlock}.
     */
    toolCallId: Schema.String,

    /**
     * The result of the tool call.
     */
    result: Schema.Unknown,
  }),
).pipe(Schema.mutable);
export interface ToolResultContentBlock extends Schema.Schema.Type<typeof ToolResultContentBlock> {}

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

export const FileContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('file'),

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
  }),
).pipe(Schema.mutable);
export interface FileContentBlock extends Schema.Schema.Type<typeof FileContentBlock> {}

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

/**
 * Suggestion for a follow-up prompt for the user.
 */
export const SuggestContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('suggestion'),
    text: Schema.String,
  }),
).pipe(Schema.mutable);
export interface SuggestContentBlock extends Schema.Schema.Type<typeof SuggestContentBlock> {}

/**
 * Proposed answer to the assistant's question.
 */
export const ProposalContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('proposal'),
    text: Schema.String,
  }),
).pipe(Schema.mutable);
export interface ProposalContentBlock extends Schema.Schema.Type<typeof ProposalContentBlock> {}

/**
 * Associates artifact (of a specific version) with this conversation.
 * Used to track associated artifacts as well their changes during the conversation.
 */
// TODO(dmaretskyi): What's the relation of this to the reference content block?
export const ArtifactPinContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('artifactPin'),

    // TODO(dmaretskyi): Consider making this a DXN.
    objectId: ObjectId,

    // TODO(dmaretskyi): Better type.
    version: Schema.Unknown,
  }),
).pipe(Schema.mutable);
export interface ArtifactPinContentBlock extends Schema.Schema.Type<typeof ArtifactPinContentBlock> {}


/**
 * Model priniting info about the list of available tools.
 */
export const ToolListContentBlock = Schema.extend(
  AbstractContentBlock,
  Schema.Struct({
    type: Schema.Literal('toolList'),
  }),
).pipe(Schema.mutable);
export interface ToolListContentBlock extends Schema.Schema.Type<typeof ToolListContentBlock> {}

/**
 * JSON
 * @deprecated Use {@link TextContentBlock} with mime type of `application/json`.
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

export const MessageContentBlock = Schema.Union(
  TextContentBlock,
  ReasoningContentBlock,
  ImageContentBlock,
  FileContentBlock,
  ReferenceContentBlock,
  TranscriptContentBlock,
  SuggestContentBlock,
  ProposalContentBlock,
  ArtifactPinContentBlock,
  ToolListContentBlock,
  JsonContentBlock,
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
