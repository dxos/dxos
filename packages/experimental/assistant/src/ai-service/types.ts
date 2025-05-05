//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { Tool, Message, type MessageContentBlock } from '@dxos/artifact';
import { type ObjectId } from '@dxos/echo-schema';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from './defs';

export const createArtifactElement = (id: ObjectId) => `<artifact id=${id} />`;

export const LLMModel = S.Literal(...DEFAULT_EDGE_MODELS, ...DEFAULT_OLLAMA_MODELS);

export type LLMModel = S.Schema.Type<typeof LLMModel>;

export const ToolTypes = Object.freeze({
  // TODO(dmaretskyi): Not implemented yet.
  // DatabaseQuery: 'database_query',
  TextToImage: 'text_to_image',
});

/**
 * Client GPT request.
 */
export const GenerateRequest = S.Struct({
  /**
   * Preferred model or system default.
   */
  model: S.optional(LLMModel),

  /**
   * Tools available for the LLM.
   */
  tools: S.optional(S.Array(Tool).pipe(S.mutable)),

  /**
   * System instructions to the LLM.
   */
  systemPrompt: S.optional(S.String),

  /**
   * History of messages to include in the context window.
   */
  // TODO(burdon): Rename messages.
  history: S.optional(S.Array(Message)),

  /**
   * Current request.
   */
  prompt: S.optional(Message),
});
export type GenerateRequest = S.Schema.Type<typeof GenerateRequest>;

/**
 * Non-streaming response.
 */
export const GenerateResponse = S.Struct({
  messages: S.Array(Message),

  /**
   * Number of tokens used in the response.
   */
  tokenCount: S.optional(S.Number),
});
export type GenerateResponse = S.Schema.Type<typeof GenerateResponse>;

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
      message: Omit<Message, 'spaceId' | 'threadId'>;
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
            type: 'input_json_delta';
            partial_json: string;
          };
    }
  | {
      type: 'content_block_stop';
      index: number;
    };
