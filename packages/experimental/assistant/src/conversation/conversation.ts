//
// Copyright 2024 DXOS.org
//

import { createStatic, ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { LLMToolResult } from './types';
import { type LLMTool, Message, type AIServiceClient, type ResultStreamEvent, type LLMModel } from '../ai-service';

export type CreateLLMConversationParams = {
  model: LLMModel;

  /**
   * System prompt that specifies instructions for the LLM.
   */
  system?: string;

  spaceId?: SpaceId;
  threadId?: ObjectId;

  tools: LLMTool[];

  history?: Message[];

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
  const history = params.history ?? [];

  const generate = async () => {
    log('llm generate', { tools: params.tools });
    const beginTs = Date.now();
    const stream = await params.client.generate({
      model: params.model,
      spaceId: params.spaceId,
      threadId: params.threadId,
      history,
      systemPrompt: params.system,
      tools: params.tools as any,
    });

    for await (const event of stream) {
      params.logger?.(event);
    }
    const messages = await stream.complete();
    const message = messages.at(-1);

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
      const toolCalls = message.content.filter((c) => c.type === 'tool_use');
      invariant(toolCalls.length === 1);
      const toolCall = toolCalls[0];
      const tool = params.tools.find((tool) => tool.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }

      const toolResult = await tool.execute(toolCall.input, {});
      switch (toolResult.kind) {
        case 'error': {
          log.warn('tool error', { message: toolResult.message });
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
          history.push(resultMessage);

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

export const isToolUse = (message: Message) => message.content.at(-1)?.type === 'tool_use';

type RunToolsOptions = {
  message: Message;
  tools: LLMTool[];
  extensions?: LLMToolContextExtensions;
};

export type RunToolsResult =
  | {
      type: 'continue';
      message: Message;
    }
  | {
      type: 'break';
      result: unknown;
    };

export const runTools = async ({ message, tools, extensions }: RunToolsOptions): Promise<RunToolsResult> => {
  const toolCalls = message.content.filter((block) => block.type === 'tool_use');
  invariant(toolCalls.length === 1);
  const toolCall = toolCalls[0];
  const tool = tools.find((tool) => tool.name === toolCall.name);
  if (!tool) {
    throw new Error(`Tool not found: ${toolCall.name}`);
  }

  let toolResult: LLMToolResult;
  try {
    toolResult = await tool.execute(toolCall.input, { extensions });
  } catch (error: any) {
    log('tool error', { error });
    toolResult = LLMToolResult.Error(error.message);
  }

  switch (toolResult.kind) {
    case 'error': {
      log('tool error', { message: toolResult.message });
      const resultMessage = createStatic(Message, {
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

      // TODO(burdon): Retry count?
      return {
        type: 'continue',
        message: resultMessage,
      };
    }

    case 'success': {
      log('tool success', { result: toolResult.result });
      const resultMessage = createStatic(Message, {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            toolUseId: toolCall.id,
            content: typeof toolResult.result === 'string' ? toolResult.result : JSON.stringify(toolResult.result),
          },
        ],
      });

      return {
        type: 'continue',
        message: resultMessage,
      };
    }

    case 'break': {
      log('tool break', { result: toolResult.result });
      return {
        type: 'break',
        result: toolResult.result,
      };
    }
  }
};
