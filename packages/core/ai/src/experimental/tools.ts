import { DataType, type ContentBlock } from '@dxos/schema';
import { AiTool, AiToolkit, type AiError } from '@effect/ai';
import { Effect } from 'effect';

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
