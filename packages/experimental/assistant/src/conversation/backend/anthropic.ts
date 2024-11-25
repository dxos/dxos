//
// Copyright 2024 DXOS.org
//

import Anthropic from '@anthropic-ai/sdk';

import { type AIBackend, type ResultStreamEvent, type RunParams, type RunResult } from './interface';
import type { LLMMessage, LLMMessageContent, LLMModel, LLMTool } from '../types';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type {
  ImageBlockParam,
  TextBlockParam,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from '@anthropic-ai/sdk/resources';

export interface AnthropicBackendParams {
  apiKey: string;
}

export class AnthropicBackend implements AIBackend {
  private readonly _apiKey: string;
  private readonly _client: Anthropic;

  constructor(params: AnthropicBackendParams) {
    this._apiKey = params.apiKey;
    this._client = new Anthropic({ apiKey: params.apiKey });
  }

  async run(params: RunParams): Promise<RunResult> {
    const messageOrStream = await this._client.messages.create({
      model: convertModel(params.model),
      messages: params.messages.map(convertMessage),

      system: params.system,

      tools: params.tools.map(convertTool),
      tool_choice:
        params.tools.length > 0
          ? {
              type: 'auto',
              disable_parallel_tool_use: true,
            }
          : undefined,
      max_tokens: 1024,

      stream: params.stream,
    });

    if (params.stream) {
      invariant(Symbol.asyncIterator in messageOrStream);
      return {
        stream: (async function* () {
          for await (const event of messageOrStream) {
            log('event', { event });
            yield convertStreamEventFromAnthropic(event);
          }
        })(),
      };
    } else {
      return {
        message: convertMessageFromAnthropic(messageOrStream as Anthropic.Message),
      };
    }
  }
}

const convertModel = (model: LLMModel): Anthropic.Model => {
  switch (model) {
    case '@anthropic/claude-3-5-sonnet-20241022':
      return 'claude-3-5-sonnet-20241022';
    case '@anthropic/claude-3-5-haiku-20241022':
      return 'claude-3-5-haiku-20241022';
    default:
      throw new Error(`Unknown model: ${model}`);
  }
};

const convertMessage = (msg: LLMMessage): Anthropic.MessageParam => ({
  role: msg.role,
  content: msg.content.map(convertContent),
});

const convertContent = (
  content: LLMMessageContent,
): TextBlockParam | ImageBlockParam | ToolUseBlockParam | ToolResultBlockParam => {
  switch (content.type) {
    case 'tool_use':
      return {
        type: 'tool_use',
        id: content.id,
        name: content.name,
        input: content.input,
      };
    default:
      return content;
  }
};

const convertTool = (tool: LLMTool): Anthropic.Messages.Tool => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.parameters as any,
});

const convertMessageFromAnthropic = (msg: Anthropic.Message): LLMMessage => ({
  role: msg.role,
  content: msg.content,
  stopReason: msg.stop_reason as any,
});

const convertStreamEventFromAnthropic = (event: Anthropic.Messages.RawMessageStreamEvent): ResultStreamEvent => {
  switch (event.type) {
    case 'message_start':
      return {
        type: 'message_start',
        message: convertMessageFromAnthropic(event.message),
      };
    case 'message_delta':
      return {
        type: 'message_delta',
        delta: {
          stopReason: event.delta.stop_reason as any,
        },
      };
    case 'message_stop':
      return {
        type: 'message_stop',
      };
    case 'content_block_start':
      return {
        type: 'content_block_start',
        index: event.index,
        content: event.content_block,
      };
    case 'content_block_delta':
      return {
        type: 'content_block_delta',
        index: event.index,
        delta: event.delta,
      };
    case 'content_block_stop':
      return {
        type: 'content_block_stop',
        index: event.index,
      };
    default:
      throw new Error(`Unknown stream event: ${(event as any).type}`);
  }
};
