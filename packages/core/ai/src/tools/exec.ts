//
// Copyright 2025 DXOS.org
//

import { type AiError, type AiTool, type AiToolkit } from '@effect/ai';
import { Effect } from 'effect';

import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/schema';

export const callTools: <Tools extends AiTool.Any>(
  toolkit: AiToolkit.ToHandler<Tools>,
  toolCalls: ContentBlock.ToolCall[],
) => Effect.Effect<ContentBlock.ToolResult[], AiError.AiError, never> = Effect.fn('callTools')(
  function* (toolkit, toolCalls) {
    log.info('callTools', { count: toolCalls.length });
    return yield* Effect.forEach(toolCalls, (toolCall) => callTool(toolkit, toolCall));
  },
);

export const callTool: <Tools extends AiTool.Any>(
  toolkit: AiToolkit.ToHandler<Tools>,
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError, AiTool.Context<Tools>> = Effect.fn('callTool')(
  function* (toolkit, toolCall) {
    log.info('callTool', { toolCall: JSON.stringify(toolCall) });
    return yield* toolkit.handle(toolCall.name as any, JSON.parse(toolCall.input)).pipe(
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
              error: String(error),
            }) satisfies ContentBlock.ToolResult,
        ),
      ),
    );
  },
);
