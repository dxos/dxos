//
// Copyright 2024 DXOS.org
//

import { JsonSchemaType } from '@dxos/echo-schema';
import { SpaceId } from '@dxos/keys';
import { Schema as S } from '@effect/schema';
import { Brand } from 'effect';
import { ulid } from 'ulidx';

// TODO(dmaretskyi): Extract IDs to protocols.
export const SpaceIdSchema: S.Schema<SpaceId, string> = S.String.pipe(S.filter(SpaceId.isValid));

export const ObjectIdBrand: unique symbol = Symbol('@dxos/echo/ObjectId');
const ObjectIdSchema = S.ULID.pipe(S.brand(ObjectIdBrand));

export type ObjectId = typeof ObjectIdSchema.Type;
export const ObjectId: S.SchemaClass<string & Brand.Brand<typeof ObjectIdBrand>, string> & { random(): ObjectId } =
  class extends ObjectIdSchema {
    static random(): ObjectId {
      return ulid() as ObjectId;
    }
  };

// TODO(dmaretskyi): Dedup this schema with the one in dxos/edge.

export const Space = S.Struct({
  id: SpaceIdSchema,
});
export interface Space extends S.Schema.Type<typeof Space> {}

export const Thread = S.Struct({
  id: ObjectId,
  spaceId: SpaceIdSchema,
});
export interface Thread extends S.Schema.Type<typeof Thread> {}

export const MessageRole = S.String.pipe(S.filter((role) => role === 'user' || role === 'assistant'));
export type MessageRole = S.Schema.Type<typeof MessageRole>;

export const MessageTextContentBlock = S.Struct({
  type: S.Literal('text'),
  text: S.String,
}).pipe(S.mutable);

export const MessageToolUseContentBlock = S.Struct({
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
  inputJson: S.optional(S.String),
}).pipe(S.mutable);

export const MessageToolResultContentBlock = S.Struct({
  type: S.Literal('tool_result'),
  toolUseId: S.String,
  content: S.String,
  isError: S.optional(S.Boolean),
});

export const MessageContentBlock = S.Union(
  MessageTextContentBlock,
  MessageToolUseContentBlock,
  MessageToolResultContentBlock,
);
export type MessageContentBlock = S.Schema.Type<typeof MessageContentBlock>;

export const Message = S.Struct({
  id: ObjectId,
  threadId: ObjectId,
  spaceId: SpaceIdSchema,

  role: MessageRole,

  content: S.Array(MessageContentBlock).pipe(S.mutable),

  /**
   * ID of the message from the foreign provider.
   */
  // TODO(dmaretskyi): Should be in meta/keys.
  foreignId: S.optional(S.String),

  // TODO(dmaretskyi): Figure out how to deal with those.
  created: S.optional(S.DateFromSelf),
  updated: S.optional(S.DateFromSelf),
});
export interface Message extends S.Schema.Type<typeof Message> {}

/**
 * Message transformed from the database row.
 */
export const MessageFromDb = S.Struct({
  ...Message.fields,
  content: S.propertySignature(Message.fields.content.pipe((schema) => S.parseJson(schema))).pipe(
    S.fromKey('contentJson'),
  ),
});

export const LLMModel = S.Literal(
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
  '@anthropic/claude-3-5-sonnet-20241022',
  '@anthropic/claude-3-5-haiku-20241022',
  '@ollama/llama-3-2-3b',
  '@ollama/llama-3-1-nemotron-70b-instruct',
  '@ollama/llama-3-1-nemotron-mini-4b-instruct',
);
export type LLMModel = S.Schema.Type<typeof LLMModel>;

export const LLMTool = S.Struct({
  name: S.String,

  /**
   * If the tool is implemented by the service a type should be provided.
   * For user-implemented tools, this field should be omitted.
   */
  // TODO(dmaretskyi): Define tool types.
  type: S.optional(S.String),

  /**
   * Required for user-implemented tools.
   */
  description: S.optional(S.String),

  /**
   * Input schema for the tool in the JSON Schema format.
   * Required for user-implemented tools.
   */
  parameters: S.optional(JsonSchemaType),
});
export interface LLMTool extends S.Schema.Type<typeof LLMTool> {}

export const GenerateRequest = S.Struct({
  model: LLMModel,

  spaceId: SpaceIdSchema,
  threadId: ObjectId,
  /**
   * System instructions to the LLM.
   */
  // TODO(dmaretskyi): Should this be part of the thread?.
  systemPrompt: S.optional(S.String),

  /**
   * Tools available for the LLM.
   */
  tools: S.Array(LLMTool).pipe(S.mutable),
});

export interface GenerateRequest extends S.Schema.Type<typeof GenerateRequest> {}

export type LLMStopReason = 'tool_use' | 'end_turn';

// TODO(dmaretskyi): Effect schema.
export type ResultStreamEvent =
  | {
      // TODO(dmaretskyi): Normalize types to our schema.
      type: 'message_start';
      message: Omit<Message, 'spaceId' | 'threadId'>;
    }
  | {
      type: 'message_delta';
      delta: {
        stopReason: LLMStopReason;
      };
    }
  | {
      type: 'message_stop';
    }
  | {
      type: 'content_block_start';
      index: number;
      content: MessageContentBlock;
    }
  | {
      type: 'content_block_delta';
      index: number;
      delta:
        | {
            type: 'text_delta';
            text: string;
          }
        | {
            partial_json: string;

            type: 'input_json_delta';
          };
    }
  | {
      type: 'content_block_stop';
      index: number;
    };
