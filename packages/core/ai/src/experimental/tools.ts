import { BaseError } from '@dxos/errors';
import { DataType, type ContentBlock } from '@dxos/schema';
import { AiTool, AiToolkit, type AiError } from '@effect/ai';
import { Context, Effect } from 'effect';
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

export const runTool: (
  toolkit: AiToolkit.ToHandler<AiTool.AiTool<string>>,
  toolCall: ContentBlock.ToolCall,
) => Effect.Effect<ContentBlock.ToolResult, AiError.AiError> = Effect.fn('runTool')(function* (toolkit, toolCall) {
  const handlerEff = toolkit.handle(toolCall.name, toolCall.input as any);
  const result = yield* handlerEff;
  return {
    _tag: 'toolResult',
    toolCallId: toolCall.toolCallId,
    name: toolCall.name,
    result,
  } satisfies ContentBlock.ToolResult;
});
