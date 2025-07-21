//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type ContentBlock, DataType } from '@dxos/schema';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from './defs';
import { Tool } from './tools';

// TODO(dmaretskyi): Rename `ModelName`.
export const LLMModel = Schema.Literal(...DEFAULT_EDGE_MODELS, ...DEFAULT_OLLAMA_MODELS);

export type LLMModel = Schema.Schema.Type<typeof LLMModel>;

export const ToolTypes = Object.freeze({
  // TODO(dmaretskyi): Not implemented yet.
  // DatabaseQuery: 'database_query',
  TextToImage: 'text_to_image',
});

/**
 * Client GPT request.
 */
export const GenerateRequest = Schema.Struct({
  /**
   * Preferred model or system default.
   */
  model: Schema.optional(LLMModel),

  /**
   * Tools available for the LLM.
   */
  tools: Schema.optional(Schema.Array(Tool).pipe(Schema.mutable)),

  /**
   * System instructions to the LLM.
   */
  systemPrompt: Schema.optional(Schema.String),

  /**
   * History of messages to include in the context window.
   */
  // TODO(burdon): Rename messages.
  history: Schema.optional(Schema.Array(DataType.Message)),

  /**
   * Current request.
   */
  prompt: Schema.optional(DataType.Message),
});
export type GenerateRequest = Schema.Schema.Type<typeof GenerateRequest>;

/**
 * Non-streaming response.
 */
export const GenerateResponse = Schema.Struct({
  messages: Schema.Array(DataType.Message),

  /**
   * Number of tokens used in the response.
   */
  tokenCount: Schema.optional(Schema.Number),
});
export type GenerateResponse = Schema.Schema.Type<typeof GenerateResponse>;

/**
 * Server-Sent Events (SSE) stream from the AI service.
 * https://docs.anthropic.com/en/api/streaming
 * https://platform.openai.com/docs/api-reference/streaming
 * https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events
 */
// TODO(dmaretskyi): Effect schema.
export type GenerationStreamEvent =
  | {
      // TODO(dmaretskyi): Normalize types to our schema.
      type: 'message_start';
      message: DataType.Message;
    }
  | {
      type: 'message_delta';
      delta: {
        stopReason: 'tool_use' | 'end_turn';
      };
    }
  | {
      type: 'message_stop';
    }
  | {
      type: 'content_block_start';
      index: number;
      content: ContentBlock.Any;
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
            type: 'input_json_delta';
            partial_json: string;
          };
    }
  | {
      type: 'content_block_stop';
      index: number;
    };
