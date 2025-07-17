import { DataType, type ContentBlock } from '@dxos/schema';
import { bufferToArray } from '@dxos/util';
import { AiInput } from '@effect/ai';
import { Array, Effect, pipe, Predicate } from 'effect';
import { AiInputPreprocessingError } from '../errors';

export const preprocessAiInput: (
  messages: DataType.Message[],
) => Effect.Effect<AiInput.AiInput, AiInputPreprocessingError, never> = Effect.fn('preprocessAiInput')(
  function* (messages) {
    return yield* pipe(
      messages,
      Effect.forEach(
        Effect.fnUntraced(function* (msg) {
          switch (msg.sender.role) {
            case 'user':
              pipe(
                msg.blocks,
                partitionUserMessage,
                Effect.forEach(
                  Effect.fnUntraced(function* (parition) {
                    switch (parition._tag) {
                      case 'tools':
                        return new AiInput.ToolMessage({
                          parts: parition.blocks.map(
                            (block) =>
                              new AiInput.ToolCallResultPart({
                                id: AiInput.ToolCallId.make(block.toolCallId),
                                name: block.toolCallId,
                                result: block.result,
                              }),
                          ),
                        });
                      case 'other':
                        return new AiInput.UserMessage({
                          userName: msg.sender.name,
                          parts: yield* pipe(
                            parition.blocks,
                            Effect.forEach(convertUserMessagePart),
                            Effect.map(Array.filter(Predicate.isNotUndefined)),
                          ),
                        });
                    }
                  }),
                ),
              );
              return [];
            case 'assistant':
              return [
                new AiInput.AssistantMessage({
                  parts: yield* pipe(
                    msg.blocks,
                    Effect.forEach(convertAssistantMessagePart),
                    Effect.map(Array.filter(Predicate.isNotUndefined)),
                  ),
                }),
              ];
            default:
              return [];
          }
        }),
      ),
      Effect.map(Array.flatten),
      Effect.map(AiInput.make),
    );
  },
);

const convertUserMessagePart: (
  block: ContentBlock.Any,
) => Effect.Effect<AiInput.UserMessagePart | undefined, AiInputPreprocessingError, never> = Effect.fnUntraced(
  function* (block) {
    switch (block._tag) {
      case 'text':
        return new AiInput.TextPart({
          text: block.text,
        });
      case 'reference':
        // TODO(dmaretskyi): Consider inlining content.
        return new AiInput.TextPart({
          text: `<object>${block.reference}</object>`,
        });
      case 'transcript':
        return new AiInput.TextPart({
          text: block.text,
        });
      case 'artifactPin':
        // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
        return undefined;
      case 'image':
        switch (block.source?.type) {
          case 'base64':
            return new AiInput.ImagePart({
              mediaType: block.source.mediaType,
              data: bufferToArray(Buffer.from(block.source.data, 'base64')),
            });
          case 'http':
            return new AiInput.ImageUrlPart({
              url: new URL(block.source.url),
            });
          default:
            return yield* Effect.fail(new AiInputPreprocessingError('Invalid image source'));
        }
      case 'file':
        // TODO(dmaretskyi): Convert data URIs into AiInput.FilePart
        return new AiInput.FileUrlPart({
          url: new URL(block.url),
        });
      case 'reasoning':
      case 'toolCall':
        return yield* Effect.fail(new AiInputPreprocessingError(`Invalid assistant content block: ${block._tag}`));
      default:
        return undefined;
    }
  },
);

const convertAssistantMessagePart: (
  block: ContentBlock.Any,
) => Effect.Effect<AiInput.AssistantMessagePart | undefined, AiInputPreprocessingError, never> = Effect.fnUntraced(
  function* (block) {
    switch (block._tag) {
      case 'text':
        return new AiInput.TextPart({
          text: block.text,
        });
      case 'reasoning':
        if (block.reasoningText && block.redactedText) {
          return yield* Effect.fail(new AiInputPreprocessingError('Invalid reasoning part'));
        } else if (block.reasoningText) {
          return new AiInput.ReasoningPart({
            reasoningText: block.reasoningText ?? block.redactedText ?? '',
            signature: block.signature,
          });
        } else if (block.redactedText) {
          return new AiInput.RedactedReasoningPart({
            redactedText: block.redactedText,
          });
        } else {
          return yield* Effect.fail(new AiInputPreprocessingError('Invalid reasoning part'));
        }
      case 'toolCall':
        return new AiInput.ToolCallPart({
          id: block.toolCallId,
          name: block.name,
          params: block.input,
        });
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
      case 'toolResult':
      case 'image':
      case 'file':
        return yield* Effect.fail(new AiInputPreprocessingError(`Invalid assistant content block: ${block._tag}`));
      default:
        return undefined;
    }
  },
);

const isToolResult = Predicate.isTagged('toolResult');

type BlocksPartition =
  | {
      _tag: 'tools';
      blocks: ContentBlock.ToolResult[];
    }
  | {
      _tag: 'other';
      blocks: Exclude<ContentBlock.Any, ContentBlock.ToolResult>[];
    };

const partitionUserMessage = (blocks: ContentBlock.Any[]): BlocksPartition[] => {
  const result: BlocksPartition[] = [];

  for (const block of blocks) {
    if (result.length === 0 || pipe(result.at(-1)!.blocks.at(-1)!, isToolResult) === isToolResult(block)) {
      result.at(-1)!.blocks.push(block as any);
    } else {
      result.push([block] as any);
    }
  }

  return result;
};
