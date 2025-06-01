//
// Copyright 2024 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AIServiceClient } from '../service';
import { type Message, type Tool } from '../tools';
import { type LLMModel, type GenerationStreamEvent } from '../types';

export type CreateLLMConversationParams = {
  model: LLMModel;

  spaceId?: SpaceId;
  threadId?: ObjectId;

  /**
   * System prompt that specifies instructions for the LLM.
   */
  system?: string;

  tools: Tool[];
  history?: Message[];
  client: AIServiceClient;

  logger?: (event: ConversationEvent) => void;
};

export type ConversationEvent =
  | {
      type: 'message';
      message: Message;
    }
  | GenerationStreamEvent;

// TODO(burdon): Replace with processor from plugin-automation?
export const runLLM = async (params: CreateLLMConversationParams) => {
  let conversationResult: any = null;
  const history = params.history ?? [];

  const generate = async () => {
    log('llm generate', { tools: params.tools });
    const beginTs = Date.now();
    const stream = await params.client.execStream({
      model: params.model,
      history,
      systemPrompt: params.system,
      tools: params.tools as any,
    });

    for await (const event of stream) {
      params.logger?.(event);
    }

    // TODO(burdon): !!!
    await stream.complete();
    const messages: Message[] = [];
    const message = messages.at(-1);
    invariant(message);

    log('llm result', { time: Date.now() - beginTs, message });
    invariant(message);
    params.logger?.({ type: 'message', message });
    history.push(
      ...messages.map(
        (message): Message => ({ ...message, content: message.content.filter((block) => block.type !== 'image') }),
      ),
    );

    const isToolUse = message.content.at(-1)?.type === 'tool_use';
    if (isToolUse) {
      const toolCalls = message.content.filter((block) => block.type === 'tool_use');
      invariant(toolCalls.length === 1);
      const toolCall = toolCalls[0];
      const tool = params.tools.find((tool) => tool.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      invariant(tool.execute);
      const toolResult = await tool.execute(toolCall.input);
      switch (toolResult.kind) {
        case 'error': {
          log.warn('tool error', { message: toolResult.message });
          const resultMessage: Message = {
            id: ObjectId.random(),
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
          history.push(resultMessage);

          return true;
        }

        case 'success': {
          log('tool success', { result: toolResult.result });
          const resultMessage: Message = {
            id: ObjectId.random(),
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
          history.push(resultMessage);

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
    history,
  };
};
