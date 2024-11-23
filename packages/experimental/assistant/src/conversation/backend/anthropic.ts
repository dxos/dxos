//
// Copyright 2024 DXOS.org
//

import Anthropic from '@anthropic-ai/sdk';

import { type AIBackend, type RunParams, type RunResult } from './interface';
import type { LLMMessage, LLMModel, LLMTool } from '../types';

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
    const message = await this._client.messages.create({
      model: convertModel(params.model),
      messages: params.messages.map(convertMessage),
      tools: params.tools.map(convertTool),
      tool_choice:
        params.tools.length > 0
          ? {
              type: 'auto',
              disable_parallel_tool_use: true,
            }
          : undefined,
      max_tokens: 1024,
    });

    return {
      message: convertMessageFromAnthropic(message),
    };
  }
}

const convertModel = (model: LLMModel): Anthropic.Model => {
  switch (model) {
    case '@anthropic/claude-3-5-sonnet-20241022':
      return 'claude-3-5-sonnet-20241022';
    default:
      throw new Error(`Unknown model: ${model}`);
  }
};

const convertMessage = (msg: LLMMessage): Anthropic.MessageParam => ({
  role: msg.role,
  content: msg.content,
});

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
