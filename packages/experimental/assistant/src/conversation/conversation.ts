//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { LLMMessage, type LLMModel, type LLMTool, type LLMToolResult, type ToolExecutionContext } from './types';
import type { AIBackend } from './backend/interface';

export type CreateLLMConversationParams = {
  model: LLMModel;
  messages: LLMMessage[];
  tools: LLMTool[];
  backend: AIBackend;
};

export const createLLMConversation = async (params: CreateLLMConversationParams) => {
  const history: LLMMessage[] = [...params.messages];
  let conversationResult: any = null;

  const generate = async () => {
    log.info('llm generate', { history, tools: params.tools });
    const beginTs = Date.now();
    const result = await params.backend.run({
      model: params.model,
      messages: history,
      tools: params.tools as any,
    });
    log.info('llm result', { time: Date.now() - beginTs, result });
    invariant(!(result instanceof ReadableStream));

    history.push(result.message);

    if (result.message.stopReason === 'tool_use') {
      const toolCalls = result.message.content.filter((c) => c.type === 'tool_use');
      invariant(toolCalls.length === 1);
      const toolCall = toolCalls[0];
      const tool = params.tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      history.push;
      const toolResult = await tool.execute(toolCall.input, {});
      switch (toolResult.kind) {
        case 'error': {
          log.info('tool error', { message: toolResult.message });
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
          return true;
        }
        case 'success': {
          log.info('tool success', { result: toolResult.result });
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
          return true;
        }
        case 'break': {
          log.info('tool break', { result: toolResult.result });
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
