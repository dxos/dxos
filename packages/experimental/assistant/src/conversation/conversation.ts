//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type LLMToolDefinition } from './types';
import { ObjectId } from '../ai-service';
import { type AIServiceClient, type Message, type ResultStreamEvent, type LLMModel } from '../ai-service';

export type CreateLLMConversationParams = {
  model: LLMModel;

  /**
   * System prompt that specifies instructions for the LLM.
   */
  system?: string;

  spaceId: SpaceId;
  threadId: ObjectId;

  tools: LLMToolDefinition[];

  client: AIServiceClient;

  logger?: (event: ConversationEvent) => void;
};

export type ConversationEvent =
  | {
      type: 'message';
      message: Message;
    }
  | ResultStreamEvent;

export const runLLM = async (params: CreateLLMConversationParams) => {
  let conversationResult: any = null;

  const generate = async () => {
    log('llm generate', { tools: params.tools });
    const beginTs = Date.now();
    const result = await params.client.generate({
      model: params.model,
      spaceId: params.spaceId,
      threadId: params.threadId,
      systemPrompt: params.system,
      tools: params.tools as any,
    });

    for await (const event of result) {
      params.logger?.(event);
    }
    const [message] = await result.complete();

    log('llm result', { time: Date.now() - beginTs, message });
    invariant(message);
    params.logger?.({ type: 'message', message });
    await params.client.insertMessages([message]);

    const isToolUse = message.content.at(-1)?.type === 'tool_use';
    if (isToolUse) {
      const toolCalls = message.content.filter((c) => c.type === 'tool_use');
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
          const resultMessage: Message = {
            id: ObjectId.random(),
            spaceId: params.spaceId,
            threadId: params.threadId,
            role: 'user',
            content: [
              {
                type: 'tool_result',
                toolUseId: toolCall.id,
                content: toolResult.message,
                isError: true,
              },
            ],
          };
          params.logger?.({ type: 'message', message: resultMessage });
          await params.client.insertMessages([resultMessage]);

          return true;
        }
        case 'success': {
          log('tool success', { result: toolResult.result });
          const resultMessage: Message = {
            id: ObjectId.random(),
            spaceId: params.spaceId,
            threadId: params.threadId,
            role: 'user',
            content: [
              {
                type: 'tool_result',
                toolUseId: toolCall.id,
                content: JSON.stringify(toolResult.result),
              },
            ],
          };
          params.logger?.({ type: 'message', message: resultMessage });
          await params.client.insertMessages([resultMessage]);

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

  // eslint-disable-next-line no-empty
  while (await generate()) {}

  return {
    result: conversationResult,
  };
};
