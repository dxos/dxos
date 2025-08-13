//
// Copyright 2025 DXOS.org
//

import { AiInput } from '@effect/ai';
import { Array, Effect, Predicate, pipe } from 'effect';

import { log } from '@dxos/log';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { assumeType, bufferToArray } from '@dxos/util';

import { AiInputPreprocessingError } from './errors';

/**
 * Preprocesses messages for AI input.
 *
 * This function takes a list of Messages and returns a list of AIInput objects.
 * The conversion is done by:
 * 1. Filtering out messages that are not from the user or assistant.
 * 2. Converting each message into an AIInput.
 * 3. Removing any invalid AIInput.
 * The function returns a list of valid AIInput objects.
 */
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
              return yield* pipe(
                msg.blocks,
                (arr) => splitBy(arr, (left, right) => isToolResult(left) !== isToolResult(right)),
                Effect.forEach(
                  Effect.fnUntraced(function* (chunk) {
                    switch (chunk[0]._tag) {
                      case 'toolResult':
                        assumeType<ContentBlock.ToolResult[]>(chunk);
                        return new AiInput.ToolMessage({
                          parts: chunk.map(
                            (block) =>
                              new AiInput.ToolCallResultPart({
                                id: AiInput.ToolCallId.make(block.toolCallId),
                                name: block.name,
                                result: block.error ?? JSON.stringify(block.result),
                              }),
                          ),
                        });
                      default:
                        return new AiInput.UserMessage({
                          userName: msg.sender.name,
                          parts: yield* pipe(
                            chunk,
                            Effect.forEach(convertUserMessagePart),
                            Effect.map(Array.filter(Predicate.isNotUndefined)),
                          ),
                        });
                    }
                  }),
                ),
              );

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
      case 'anchor':
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
    log('parse', { block });
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
          params: JSON.parse(block.input),
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
      case 'anchor':
        // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
        return undefined;
      case 'proposal':
        return new AiInput.TextPart({
          text: `<proposal>${block.text}</proposal>`,
        });
      case 'toolkit':
        return new AiInput.TextPart({
          text: '<toolkit/>',
        });
      case 'json':
        return new AiInput.TextPart({
          text: block.data,
        });
      case 'toolResult':
      case 'image':
      case 'file':
        // TODO(burdon): Just log and ignore?
        return yield* Effect.fail(new AiInputPreprocessingError(`Invalid assistant content block: ${block._tag}`));
      default:
        // Ignore spurious tags.
        log.warn('ignoring spurious tag', { block });
        return undefined;
    }
  },
);

const isToolResult = Predicate.isTagged('toolResult');

/**
 * @param predicate Determines whether to split an array at this location, based on two neighbors.
 * @returns Arrays partitioned into subarrays based on the predicate.
 */
// TODO(dmaretskyi): Extract.
const splitBy = <T>(arr: T[], predicate: (left: T, right: T) => boolean): T[][] => {
  const result: T[][] = [];
  for (const item of arr) {
    if (result.length === 0) {
      result.push([item]);
      continue;
    }

    const prevChunk = result.at(-1)!;
    const prev = prevChunk.at(-1)!;
    const makeSplit = predicate(prev, item);
    if (makeSplit) {
      result.push([item]);
    } else {
      prevChunk.push(item);
    }
  }

  return result;
};
