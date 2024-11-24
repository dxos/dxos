//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { AIBackend } from './backend/interface';
import { type LLMMessage, type LLMModel, type LLMTool } from './types';

export type CreateLLMConversationParams = {
  model: LLMModel;
  messages: LLMMessage[];

  /**
   * System prompt that specifies instructions for the LLM.
   */
  system?: string;

  tools: LLMTool[];
  backend: AIBackend;

  logger?: (event: ConversationEvent) => void;
};

export type ConversationEvent = {
  type: 'message';
  message: LLMMessage;
};

export const runLLM = async (params: CreateLLMConversationParams) => {
  const history: LLMMessage[] = [...params.messages];
  let conversationResult: any = null;
  for (const message of history) {
    params.logger?.({ type: 'message', message });
  }

  const generate = async () => {
    log('llm generate', { history, tools: params.tools });
    const beginTs = Date.now();
    const result = await params.backend.run({
      model: params.model,
      messages: history,
      system: params.system,
      tools: params.tools as any,
    });
    log('llm result', { time: Date.now() - beginTs, result });
    invariant(!(result instanceof ReadableStream));

    history.push(result.message);
    params.logger?.({ type: 'message', message: result.message });

    if (result.message.stopReason === 'tool_use') {
      const toolCalls = result.message.content.filter((c) => c.type === 'tool_use');
      invariant(toolCalls.length === 1);
      const toolCall = toolCalls[0];
      const tool = params.tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      const toolResult = await tool.execute(toolCall.input, {});
      switch (toolResult.kind) {
        case 'error': {
          log('tool error', { message: toolResult.message });
          history.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolCall.id,
                content: toolResult.message,
                is_error: true,
              },
            ],
          });
          params.logger?.({ type: 'message', message: history.at(-1)! });

          return true;
        }
        case 'success': {
          log('tool success', { result: toolResult.result });
          history.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolCall.id,
                content: JSON.stringify(toolResult.result),
              },
            ],
          });
          params.logger?.({ type: 'message', message: history.at(-1)! });
          return true;
        }
        case 'break': {
          log('tool break', { result: toolResult.result });
          conversationResult = toolResult.result;
          return false;
        }
      }
    }
    return false;
  };

  while (await generate()) {}

  return {
    history,
    result: conversationResult,
  };
};
