//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import type * as AiError from 'effect/unstable/ai/AiError';
import type * as Tool from 'effect/unstable/ai/Tool';
import type * as Toolkit from 'effect/unstable/ai/Toolkit';

import { log } from '@dxos/log';
import { ContentBlock } from '@dxos/types';
import { safeParseJson } from '@dxos/util';

// TODO(burdon): Not Used?
export const callTools: <Tools extends Record<string, Tool.Any>>(
  toolkit: Toolkit.WithHandler<Tools>,
  toolCalls: ContentBlock.ToolCall[],
) => Effect.Effect<ContentBlock.ToolResult[], AiError.AiError, Tool.HandlerServices<Tools[keyof Tools]>> = Effect.fn(
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
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError, Tool.HandlerServices<Tools[keyof Tools]>> = Effect.fn(
  'callTool',
)(function* (toolkit, toolCall) {
  // Empty input means a tool without parameters; unparseable input is reported back as a tool
  // error so the model can retry rather than the tool running with no arguments.
  const input = toolCall.input.trim().length === 0 ? {} : safeParseJson<Record<string, unknown>>(toolCall.input);
  if (input === undefined) {
    log.warn('tool call arguments did not parse', { tool: toolCall.name, input: toolCall.input });
    return {
      _tag: 'toolResult',
      toolCallId: toolCall.toolCallId,
      name: toolCall.name,
      error: `Invalid JSON arguments for tool '${toolCall.name}'. Retry the call with valid JSON.`,
      providerExecuted: false,
    } satisfies ContentBlock.ToolResult;
  }

  // TODO(burdon): Replace with spans? (CORE: Auto stringify proxy objects?)
  log('toolCall', { toolCall: toolCall.name, input });
  const toolResult = yield* toolkit
    .handle(
      // `toolCall.name`/`input` are untrusted runtime data from the model response, so nothing
      // statically ties them to one tool's key and parameters; a mismatch surfaces as a normal
      // `handle` failure below rather than corrupting state.
      toolCall.name as keyof Toolkit.WithHandlerTools<typeof toolkit>,
      input as Tool.Parameters<
        Toolkit.WithHandlerTools<typeof toolkit>[keyof Toolkit.WithHandlerTools<typeof toolkit>]
      >,
    )
    .pipe(
      // v4 streams preliminary results ahead of the final one; only the last is authoritative.
      Effect.flatMap((stream) =>
        stream.pipe(
          Stream.filter((handled) => !handled.preliminary),
          Stream.runLast,
        ),
      ),
      Effect.map((handled) => {
        const result = Option.getOrUndefined(handled)?.result;
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
      Effect.catchCause((cause) =>
        Effect.sync(() => {
          const errors = Cause.prettyErrors(cause);
          // A serialized error can carry no readable text, so name the tool and message separately.
          log.warn('tool failed', { tool: toolCall.name, message: errors[0]?.message, err: errors[0] });
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
});

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
