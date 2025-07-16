import { DataType, type ContentBlock } from '@dxos/schema';
import { AiInput } from '@effect/ai';
import { Effect } from 'effect';
import { AiInputPreprocessingError } from '../errors';

const preprocessAiInput: (
  messages: DataType.Message[],
) => Effect.Effect<AiInput.AiInput, AiInputPreprocessingError, never> = Effect.fn('preprocessAiInput')(
  function* (messages) {
    return AiInput.make(
      messages.flatMap((msg): AiInput.Message[] => {
        switch (msg.sender.role) {
          case 'user':
            return [
              new AiInput.UserMessage({
                parts: [],
              }),
            ];
          case 'assistant':
            return [
              new AiInput.AssistantMessage({
                parts: [],
              }),
            ];
          default:
            return [];
        }
      }),
    );
  },
);

const convertAssistantMessagePart = Effect.fnUntraced(function* (block: ContentBlock.Any) {
  switch (block._tag) {
    case 'text':
      return new AiInput.TextPart({
        text: block.text,
      });
    case 'reasoning':
      return new AiInput.ReasoningPart({
        reasoningText: block.reasoningText ?? block.redactedText ?? '',
      });
    case 'toolCall':
      return new AiInput.ToolCallPart({
        id: block.toolCallId,
        name: block.name,
        params: block.input,
      });
    case 'toolResult':
      // Note: AiInput doesn't seem to have ToolCallResultPart, falling back to TextPart
      return new AiInput.TextPart({
        text: `Tool result for ${block.toolCallId}: ${JSON.stringify(block.result)}`,
      });
    case 'image':
      // Note: AiInput doesn't seem to have ImagePart, falling back to TextPart
      return new AiInput.TextPart({
        text: `[Image: ${block.id ?? 'unnamed'}]`,
      });
    case 'file':
      return yield* Effect.fail(new AiInputPreprocessingError('Invalid content block: file'));
    case 'reference':
      // TODO(dmaretskyi): Consider inlining content.
      return new AiInput.TextPart({
        text: `<object>${block.reference}</object>`,
      });
    case 'transcript':
      return new AiInput.TextPart({
        text: block.text,
      });
    case 'status':
      return new AiInput.TextPart({
        text: `<status>${block.statusText}</status>`,
      });
    case 'suggest':
      return new AiInput.TextPart({
        text: `<suggest>${block.text}</suggest>`,
      });
    case 'select':
      return new AiInput.TextPart({
        text: `<select>${block.options.map((option) => `<option>${option}</option>`).join('')}</select>`,
      });
    case 'artifactPin':
      // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
      return undefined;
    case 'proposal':
      return new AiInput.TextPart({
        text: `<proposal>${block.text}</proposal>`,
      });
    case 'toolList':
      return new AiInput.TextPart({
        text: '<tool-list/>',
      });
    case 'json':
      return new AiInput.TextPart({
        text: block.data,
      });
    default:
      return undefined;
  }
});
