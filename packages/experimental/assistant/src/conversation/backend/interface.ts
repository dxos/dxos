//
// Copyright 2024 DXOS.org
//

import { type LLMMessage, type LLMMessageContent, type LLMModel, type LLMStopReason, type LLMTool } from '../types';

// TODO(dmaretskyi): Multi-backend support.
export interface AIBackend {
  run: (params: RunParams) => Promise<RunResult>;
}

export type RunParams = {
  model: LLMModel;
  messages: LLMMessage[];
  /**
   * System prompt to specify instructions for the LLM.
   */
  system?: string;
  tools: LLMTool[];

  stream?: boolean;
};

export type RunResult =
  | {
      message: LLMMessage;
    }
  | {
      stream: AsyncIterable<ResultStreamEvent>;
    };

export type ResultStreamEvent =
  | {
      type: 'message_start';
      message: LLMMessage;
    }
  | {
      type: 'message_delta';
      delta: {
        stopReason: LLMStopReason;
      }
    }
  | {
      type: 'message_stop';
    }
  | {
      type: 'content_block_start';
      index: number;
      content: LLMMessageContent;
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
