//
// Copyright 2024 DXOS.org
//

import { Message, type Tool, ToolResult } from '@dxos/artifact';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export const isToolUse = (message: Message, { onlyToolNames }: { onlyToolNames?: string[] } = {}) => {
  const block = message.content.at(-1);
  invariant(block);
  return block.type === 'tool_use' && (!onlyToolNames || onlyToolNames.includes(block.name));
};

export type RunToolsOptions = {
  message: Message;
  tools: Tool[];
  extensions?: ToolContextExtensions;
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
    const resultMessage = create(Message, {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          toolUseId: toolCall.id,
          content: `Tool not found: ${toolCall.name}`,
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

  let toolResult: ToolResult;
  try {
    invariant(tool.execute);
    toolResult = await tool.execute(toolCall.input, { extensions });
  } catch (error: any) {
    log.warn('tool error', { error });
    toolResult = ToolResult.Error(error.message);
  }

  switch (toolResult.kind) {
    case 'error': {
      log('tool error', { message: toolResult.message });
      const resultMessage = create(Message, {
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
      const resultMessage = create(Message, {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            toolUseId: toolCall.id,
            content:
              typeof toolResult.result === 'string' ? toolResult.result : JSON.stringify(toolResult.result) ?? '',
          },
          ...(toolResult.extractContentBlocks ?? []),
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
    default: {
      throw new Error(`Invalid tool result`);
    }
  }
};
