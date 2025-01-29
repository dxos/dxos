//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { JsonSchemaType, ObjectId } from '@dxos/echo-schema';

import { Message, type MessageContentBlock, SpaceIdSchema } from './message';

export const LLMModel = S.Literal(
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
  '@anthropic/claude-3-5-sonnet-20241022',
  '@anthropic/claude-3-5-haiku-20241022',
  '@ollama/llama-3-2-3b',
  '@ollama/llama-3-1-nemotron-70b-instruct',
  '@ollama/llama-3-1-nemotron-mini-4b-instruct',
);
export type LLMModel = S.Schema.Type<typeof LLMModel>;

export const ToolTypes = Object.freeze({
  // TODO(dmaretskyi): Not implemented yet.
  // DatabaseQuery: 'database_query',

  TextToImage: 'text_to_image',
});

export const LLMTool = S.Struct({
  name: S.String,

  /**
   * If the tool is implemented by the service a type should be provided.
   * For user-implemented tools, this field should be omitted.
   * See {@link ToolTypes} for the list of supported types.
   */
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

  /**
   * Tool-specific options.
   */
  options: S.optional(S.Any),

  /**
   * Javascript function to execute the tool.
   */
  execute: S.optional(S.Any),
});

export interface LLMTool extends S.Schema.Type<typeof LLMTool> {}

export const GenerateRequest = S.Struct({
  model: LLMModel,

  spaceId: S.optional(SpaceIdSchema),
  threadId: S.optional(ObjectId),

  /**
   * History of messages to include in the context window.
   */
  history: S.optional(S.Array(Message)),

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
// TODO(dmaretskyi): Rename GenerationStreamEvent.
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
