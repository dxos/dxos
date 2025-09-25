//
// Copyright 2025 DXOS.org
//

import { type AiError, type Tool, type Toolkit } from '@effect/ai';
import { Effect } from 'effect';

import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/schema';
import { safeParseJson } from '@dxos/util';

// TODO(burdon): Not Used?
export const callTools: <Tools extends Tool.Any>(
  toolkit: Toolkit.ToHandler<Tools>,
  toolCalls: ContentBlock.ToolCall[],
) => Effect.Effect<ContentBlock.ToolResult[], AiError.AiError, Tool.Context<Tools>> = Effect.fn('callTools')(
  function* (toolkit, toolCalls) {
    log.info('callTools', { count: toolCalls.length });
    return yield* Effect.forEach(toolCalls, (toolCall) => callTool(toolkit, toolCall));
  },
);

/**
 * Call individual tool.
 */
export const callTool: <Tools extends Tool.Any>(
  toolkit: Toolkit.ToHandler<Tools>,
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError, Tool.Context<Tools>> = Effect.fn('callTool')(
  function* (toolkit, toolCall) {
    const input = safeParseJson<AiTool.Parameters<any>>(toolCall.input, {});

    // TODO(burdon): Replace with spans? (CORE: Auto stringify proxy objects?)
    log('toolCall', { toolCall: toolCall.name, input });
    const toolResult = yield* toolkit.handle(toolCall.name as any, input).pipe(
      Effect.map(
        // TODO(dmaretskyi): Effect returns ({ result, encodedResult })
        ({ result }) =>
          ({
            _tag: 'toolResult',
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            // TODO(dmaretskyi): Should we use encodedResult?
            result: JSON.stringify(result),
          }) satisfies ContentBlock.ToolResult,
      ),
      Effect.catchAll((error) =>
        Effect.sync(
          () =>
            ({
              // TODO(dmaretskyi): Effect-ai does not support isError flag.
              _tag: 'toolResult',
              toolCallId: toolCall.toolCallId,
              name: toolCall.name,
              error: formatError(error),
            }) satisfies ContentBlock.ToolResult,
        ),
      ),
    );

    log('toolResult', {
      toolCall: toolCall.name,
      ...{
        error: 'error' in toolResult ? toolResult.error : undefined,
        result: 'result' in toolResult ? safeParseJson(toolResult.result) : undefined,
      },
    });

    return toolResult;
  },
);

const formatError = (error: Error): string => {
  if (error.cause) {
    return `${String(error)}\ncaused by:\n${formatError(error.cause as Error)}`;
  } else {
    return String(error);
  }
};
