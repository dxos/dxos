//
// Copyright 2025 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { log } from '@dxos/log';
import { ContentBlock } from '@dxos/types';
import { safeParseJson } from '@dxos/util';

// TODO(burdon): Not Used?
export const callTools: <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.WithHandler<Tools>,
  toolCalls: ContentBlock.ToolCall[],
) => Effect.Effect<ContentBlock.ToolResult[], AiError.AiError, Tool.Requirements<Tools>> = Effect.fn('callTools')(
  function* (toolkit, toolCalls) {
    log.info('callTools', { count: toolCalls.length });
    return yield* Effect.forEach(toolCalls, (toolCall) => callTool(toolkit, toolCall));
  },
);

/**
 * Call individual tool.
 */
export const callTool: <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.WithHandler<Tools>,
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError, Tool.Requirements<Tools>> = Effect.fn('callTool')(
  function* (toolkit, toolCall) {
    const input = safeParseJson<Record<string, unknown>>(toolCall.input, {});

    // TODO(burdon): Replace with spans? (CORE: Auto stringify proxy objects?)
    log('toolCall', { toolCall: toolCall.name, input });
    const toolResult = yield* toolkit.handle(toolCall.name as any, input as any).pipe(
      Effect.map(({ result }) => {
        let unwrapped: unknown = result;
        if (Exit.isExit(result)) {
          const exit: Exit.Exit<unknown, unknown> = result;
          if (Exit.isSuccess(exit)) {
            unwrapped = exit.value;
          } else {
            return {
              _tag: 'toolResult',
              toolCallId: toolCall.toolCallId,
              name: toolCall.name,
              error: `Tool execution failed: ${Cause.pretty(exit.cause)}`,
              providerExecuted: false,
            } satisfies ContentBlock.ToolResult;
          }
        }
        return {
          _tag: 'toolResult',
          toolCallId: toolCall.toolCallId,
          name: toolCall.name,
          // TODO(dmaretskyi): Should we use encodedResult?
          result: ContentBlock.isContentBlockResult(unwrapped) ? unwrapped : JSON.stringify(unwrapped),
          providerExecuted: false,
        } satisfies ContentBlock.ToolResult;
      }),
      Effect.catchAllCause((cause) =>
        Effect.sync(() => {
          const errors = Cause.prettyErrors(cause);
          log.warn('tool failed', { err: errors[0] });
          return {
            // TODO(dmaretskyi): Effect-ai does not support isError flag.
            _tag: 'toolResult',
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            error: formatError(errors[0]),
            providerExecuted: false,
          } satisfies ContentBlock.ToolResult;
        }),
      ),
    );

    log('toolResult', {
      toolCall: toolCall.name,
      ...{
        error: 'error' in toolResult ? toolResult.error : undefined,
        result:
          'result' in toolResult
            ? typeof toolResult.result === 'string'
              ? safeParseJson(toolResult.result)
              : toolResult.result
            : undefined,
      },
    });

    return toolResult;
  },
);

/**
 * Formats the error with the cause chain included, but omiting the stack trace.
 */
const formatError = (error: Error): string => {
  if (error.cause) {
    return `${String(error)}\ncaused by:\n${formatError(error.cause as Error)}`;
  } else {
    return String(error);
  }
};
