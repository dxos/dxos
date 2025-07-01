//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { type AiServiceClient } from '../service';
import { Message, type ExecutableTool } from '../tools';
import { type LLMModel, type GenerationStreamEvent } from '../types';

export type CreateLLMConversationParams = {
  model: LLMModel;

  spaceId?: SpaceId;
  threadId?: ObjectId;

  /**
   * System prompt that specifies instructions for the LLM.
   */
  // TODO(burdon): Rename systemPrompt.
  system?: string;

  // TODO(burdon): Tool registry.
  tools: ExecutableTool[];
  history?: Message[];
  aiClient: AiServiceClient;

  logger?: (event: ConversationEvent) => void;
};

export type ConversationEvent =
  | {
      type: 'message';
      message: Message;
    }
  | GenerationStreamEvent;

// TODO(burdon): Replace with processor from plugin-automation?
export const runLLM = async ({ aiClient, system, model, history = [], tools, logger }: CreateLLMConversationParams) => {
  let conversationResult: any = null;

  const generate = async () => {
    log('llm generate', { tools });
    const beginTs = Date.now();
    const stream = await aiClient.execStream({
      model,
      history,
      systemPrompt: system,
      tools: tools as any,
    });

    for await (const event of stream) {
      logger?.(event);
    }

    // TODO(burdon): !!!
    await stream.complete();
    const messages: Message[] = [];
    const message = messages.at(-1);
    invariant(message);

    log('llm result', { time: Date.now() - beginTs, message });
    invariant(message);
    logger?.({ type: 'message', message });
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
      const tool = tools.find((tool) => tool.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      invariant(tool.execute);
      const toolResult = await tool.execute(toolCall.input, {});
      switch (toolResult.kind) {
        case 'error': {
          log.warn('tool error', { message: toolResult.message });
          const resultMessage: Message = Obj.make(Message, {
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
          });
          logger?.({ type: 'message', message: resultMessage });
          history.push(resultMessage);

          return true;
        }

        case 'success': {
          log('tool success', { result: toolResult.result });
          const resultMessage: Message = Obj.make(Message, {
            id: ObjectId.random(),
            role: 'user',
            content: [
              {
                type: 'tool_result',
                toolUseId: toolCall.id,
                content: JSON.stringify(toolResult.result),
              },
            ],
          });
          logger?.({ type: 'message', message: resultMessage });
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
