//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { Tool, Message, type MessageContentBlock, SpaceIdSchema } from '@dxos/artifact';
import { ObjectId } from '@dxos/echo-schema';

export const createArtifactElement = (id: ObjectId) => `<artifact id=${id} />`;

export const LLMModel = S.Literal(
  '@anthropic/claude-3-5-haiku-20241022',
  '@anthropic/claude-3-5-sonnet-20241022',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
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

/**
 * Client GPT request.
 */
export const GenerateRequest = S.Struct({
  spaceId: S.optional(SpaceIdSchema),
  threadId: S.optional(ObjectId),

  model: LLMModel,

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
  tools: S.optional(S.Array(Tool).pipe(S.mutable)),
});

export type GenerateRequest = S.Schema.Type<typeof GenerateRequest>;

// TODO(dmaretskyi): Effect schema.
// TODO(burdon): Where is this defined?
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
