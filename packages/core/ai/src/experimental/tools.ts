//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit, type AiError } from '@effect/ai';
import { Context, Effect } from 'effect';

import { BaseError } from '@dxos/errors';
import { type DataType, type ContentBlock } from '@dxos/schema';

import type { ToolId } from '../tools';

export class AiToolNotFoundError extends BaseError.extend('AI_TOOL_NOT_FOUND') {}

export class ToolResolverService extends Context.Tag('ToolResolverService')<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<AiTool.Any, AiToolNotFoundError>;
  }
>() {
  static resolve = Effect.serviceFunctionEffect(ToolResolverService, (_) => _.resolve);

  static resolveToolkit: (
    ids: ToolId[],
  ) => Effect.Effect<AiToolkit.AiToolkit<AiTool.Any>, AiToolNotFoundError, ToolResolverService> = (ids) =>
    Effect.gen(function* () {
      const tools = yield* Effect.all(ids.map(ToolResolverService.resolve));
      return AiToolkit.make(...tools);
    });
}

export class ToolExecutionService extends Context.Tag('ToolExecutionService')<
  ToolExecutionService,
  {
    readonly handlersFor: <Tools extends AiTool.Any>(toolkit: AiToolkit.AiToolkit<Tools>) => AiTool.ToHandler<Tools>;
  }
>() {
  static handlersFor = Effect.serviceFunction(ToolExecutionService, (_) => _.handlersFor);
}

export const getToolCalls = (message: DataType.Message): ContentBlock.ToolCall[] => {
  return message.blocks.filter((block) => block._tag === 'toolCall');
};

export const runTool: <Tools extends AiTool.Any>(
  toolkit: AiToolkit.ToHandler<Tools>,
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError, AiTool.Context<Tools>> = Effect.fn('runTool')(
  function* (toolkit, toolCall) {
    return yield* toolkit.handle(toolCall.name as any, toolCall.input as any).pipe(
      Effect.map(
        (result) =>
          ({
            _tag: 'toolResult',
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            result,
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
              result: error,
            }) satisfies ContentBlock.ToolResult,
        ),
      ),
    );
  },
);
