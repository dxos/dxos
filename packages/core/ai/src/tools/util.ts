//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { Message } from './message';
import { type ExecutableTool, ToolResult } from './tool';
import { type AgentStatus } from '../status-report';

export const isToolUse = (message: Message, { onlyToolNames }: { onlyToolNames?: string[] } = {}) => {
  const block = message.content.at(-1);
  return block && block.type === 'tool_use' && (!onlyToolNames || onlyToolNames.includes(block.name));
};

export type RunToolsOptions = {
  message: Message;
  tools: ExecutableTool[];
  extensions?: ToolContextExtensions;
  reportStatus: (status: AgentStatus) => void;
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

export const runTools = async ({
  message,
  tools,
  extensions,
  reportStatus,
}: RunToolsOptions): Promise<RunToolsResult> => {
  const toolCalls = message.content.filter((block) => block.type === 'tool_use');
  invariant(toolCalls.length === 1);
  const toolCall = toolCalls[0];
  const tool = tools.find((tool) => tool.name === toolCall.name);
  if (!tool) {
    const resultMessage = Obj.make(Message, {
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
    toolResult = await tool.execute(toolCall.input, { extensions, reportStatus });
  } catch (error: any) {
    log.warn('tool error', { error });
    toolResult = ToolResult.Error(error.message);
  }

  switch (toolResult.kind) {
    case 'error': {
      log('tool error', { message: toolResult.message });
      const resultMessage = Obj.make(Message, {
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
      const resultMessage = Obj.make(Message, {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            toolUseId: toolCall.id,
            content:
              typeof toolResult.result === 'string' ? toolResult.result : (JSON.stringify(toolResult.result) ?? ''),
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
      throw new Error('Invalid tool result');
    }
  }
};
