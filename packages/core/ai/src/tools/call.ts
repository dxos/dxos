//
// Copyright 2025 DXOS.org
//

import { type AiError, type AiTool, type AiToolkit } from '@effect/ai';
import { Effect } from 'effect';

import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/schema';

// TODO(burdon): Not called?
export const callTools: <Tools extends AiTool.Any>(
  toolkit: AiToolkit.ToHandler<Tools>,
  toolCalls: ContentBlock.ToolCall[],
) => Effect.Effect<ContentBlock.ToolResult[], AiError.AiError, AiTool.Context<Tools>> = Effect.fn('callTools')(
  function* (toolkit, toolCalls) {
    log.info('callTools', { count: toolCalls.length });
    return yield* Effect.forEach(toolCalls, (toolCall) => callTool(toolkit, toolCall));
  },
);

/**
 * Call individual tool.
 */
export const callTool: <Tools extends AiTool.Any>(
  toolkit: AiToolkit.ToHandler<Tools>,
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError, AiTool.Context<Tools>> = Effect.fn('callTool')(
  function* (toolkit, toolCall) {
    const input = JSON.parse(toolCall.input);
    // TODO(burdon): Auto stringify proxy objects.
    log.info('callTool', { toolCall: JSON.stringify(toolCall), input });
    return yield* toolkit.handle(toolCall.name as any, input).pipe(
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
  },
);

const formatError = (error: Error): string => {
  if (error.cause) {
    return `${String(error)}\ncaused by:\n${formatError(error.cause as Error)}`;
  } else {
    return String(error);
  }
};
