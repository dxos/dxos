//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Remove file?
// @ts-nocheck

import { Obj } from '@dxos/echo';
import { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { type AiServiceClient } from '../service';
import { type ExecutableTool } from '../tools';
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
  history?: DataType.Message[];
  aiClient: AiServiceClient;

  logger?: (event: ConversationEvent) => void;
};

export type ConversationEvent =
  | {
      type: 'message';
      message: DataType.Message;
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

    await stream.complete();
    const messages: DataType.Message[] = [];
    const message = messages.at(-1);
    invariant(message);

    log('llm result', { time: Date.now() - beginTs, message });
    invariant(message);
    logger?.({ type: 'message', message });
    history.push(
      ...messages.map(
        (message): DataType.Message => ({
          ...message,
          blocks: message.blocks.filter((block) => block._tag !== 'image'),
        }),
      ),
    );

    const isToolUse = message.blocks.at(-1)?._tag === 'toolCall';
    if (isToolUse) {
      const toolCalls = message.blocks.filter((block) => block._tag === 'toolCall');
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
          const resultMessage = Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            id: ObjectId.random(),
            blocks: [
              {
                _tag: 'toolResult',
                name: toolCall.name,
                toolCallId: toolCall.id,
                result: toolResult.message,
                // isError: true,
              },
            ],
          });
          logger?.({ type: 'message', message: resultMessage });
          history.push(resultMessage);

          return true;
        }

        case 'success': {
          log('tool success', { result: toolResult.result });
          const resultMessage = Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: [
              {
                _tag: 'toolResult',
                name: toolCall.name,
                toolCallId: toolCall.id,
                result: JSON.stringify(toolResult.result),
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
