//
// Copyright 2025 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';
import { safeParseJson } from '@dxos/util';

type ContentBlock = typeof DataType.ContentBlock;

// TODO(burdon): Not Used?
export const callTools: <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.WithHandler<Tools>,
  toolCalls: DataType.ContentBlock.ToolCall[],
) => Effect.Effect<DataType.ContentBlock.ToolResult[], AiError.AiError, Tool.Requirements<Tools>> = Effect.fn(
  'callTools',
)(function* (toolkit, toolCalls) {
  log.info('callTools', { count: toolCalls.length });
  return yield* Effect.forEach(toolCalls, (toolCall) => callTool(toolkit, toolCall));
});

/**
 * Call individual tool.
 */
export const callTool: <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.WithHandler<Tools>,
  toolCall: DataType.ContentBlock.ToolCall,
) => Effect.Effect<DataType.ContentBlock.ToolResult, AiError.AiError, Tool.Requirements<Tools>> = Effect.fn('callTool')(
  function* (toolkit, toolCall) {
    const input = safeParseJson<Tool.Parameters<any>>(toolCall.input, {});

    // TODO(burdon): Replace with spans? (CORE: Auto stringify proxy objects?)
    log('toolCall', { toolCall: toolCall.name, input });
    const toolResult = yield* toolkit.handle(toolCall.name as any, input as any).pipe(
      Effect.map(
        ({ result }) =>
          ({
            _tag: 'toolResult',
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            // TODO(dmaretskyi): Should we use encodedResult?
            result: JSON.stringify(result),
            providerExecuted: false,
          }) satisfies DataType.ContentBlock.ToolResult,
      ),
      Effect.catchAllCause((cause) =>
        Effect.sync(
          () =>
            ({
              // TODO(dmaretskyi): Effect-ai does not support isError flag.
              _tag: 'toolResult',
              toolCallId: toolCall.toolCallId,
              name: toolCall.name,
              error: formatError(Cause.prettyErrors(cause)[0]),
              providerExecuted: false,
            }) satisfies DataType.ContentBlock.ToolResult,
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
