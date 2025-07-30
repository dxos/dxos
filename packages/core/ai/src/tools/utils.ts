//
// Copyright 2025 DXOS.org
//

import { type AiTool, AiToolkit, type AiError } from '@effect/ai';
import { Context, Effect, Layer, Record } from 'effect';

import { BaseError } from '@dxos/errors';
import { type DataType, type ContentBlock } from '@dxos/schema';




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
        // TODO(dmaretskyi): Effect returns ({ result, encodedResult })
        ({ result }) =>
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
