//
// Copyright 2025 DXOS.org
//

import { Prompt } from '@effect/ai';
import { Array, Effect, Predicate, pipe } from 'effect';

import { log } from '@dxos/log';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { assumeType, bufferToArray } from '@dxos/util';

import { PromptPreprocessingError as PromptPreprocesorError } from './errors';

/**
 * Preprocesses messages for AI input.
 *
 * This function takes a list of Messages and returns a list of Prompt objects.
 * The conversion is done by:
 * 1. Filtering out messages that are not from the user or assistant.
 * 2. Converting each message into an Prompt.
 * 3. Removing any invalid Prompt.
 *
 * The function returns a list of valid Prompt objects.
 */
export const preprocessPrompt: (
  messages: DataType.Message[],
) => Effect.Effect<Prompt.Prompt, PromptPreprocesorError, never> = Effect.fn('preprocessPrompt')(function* (messages) {
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
                      return new Prompt.ToolMessage({
                        parts: chunk.map(
                          (block) =>
                            new Prompt.ToolCallResultPart({
                              id: Prompt.ToolCallId.make(block.toolCallId),
                              name: block.name,
                              result: block.error ?? (block.result ? JSON.parse(block.result) : {}),
                            }),
                        ),
                      });
                    default:
                      return new Prompt.UserMessage({
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
              new Prompt.AssistantMessage({
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
    Effect.map(Prompt.make),
  );
});

const convertUserMessagePart: (
  block: ContentBlock.Any,
) => Effect.Effect<Prompt.UserMessagePart | undefined, PromptPreprocesorError, never> = Effect.fnUntraced(
  function* (block) {
    switch (block._tag) {
      case 'text':
        return new Prompt.TextPart({
          text: block.text,
        });
      case 'reference':
        // TODO(dmaretskyi): Consider inlining content.
        return new Prompt.TextPart({
          text: `<object>${block.reference}</object>`,
        });
      case 'transcript':
        return new Prompt.TextPart({
          text: block.text,
        });
      case 'anchor':
        // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
        return undefined;
      case 'image':
        switch (block.source?.type) {
          case 'base64':
            return new Prompt.ImagePart({
              mediaType: block.source.mediaType,
              data: bufferToArray(Buffer.from(block.source.data, 'base64')),
            });
          case 'http':
            return new Prompt.ImageUrlPart({
              url: new URL(block.source.url),
            });
          default:
            return yield* Effect.fail(new PromptPreprocesorError({ message: 'Invalid image source' }));
        }
      case 'file':
        // TODO(dmaretskyi): Convert data URIs into Prompt.FilePart
        return new Prompt.FileUrlPart({
          url: new URL(block.url),
        });
      case 'reasoning':
      case 'toolCall':
        return yield* Effect.fail(
          new PromptPreprocesorError({ message: `Invalid assistant content block: ${block._tag}` }),
        );
      default:
        return undefined;
    }
  },
);

const convertAssistantMessagePart: (
  block: ContentBlock.Any,
) => Effect.Effect<Prompt.AssistantMessagePart | undefined, PromptPreprocesorError, never> = Effect.fnUntraced(
  function* (block) {
    log('parse', { block });
    switch (block._tag) {
      case 'text':
        return new Prompt.TextPart({
          text: block.text,
        });
      case 'reasoning':
        if (block.reasoningText && block.redactedText) {
          return yield* Effect.fail(new PromptPreprocesorError({ message: 'Invalid reasoning part' }));
        } else if (block.reasoningText) {
          return new Prompt.ReasoningPart({
            reasoningText: block.reasoningText ?? block.redactedText ?? '',
            signature: block.signature,
          });
        } else if (block.redactedText) {
          return new Prompt.RedactedReasoningPart({
            redactedText: block.redactedText,
          });
        } else {
          return yield* Effect.fail(new PromptPreprocesorError({ message: 'Invalid reasoning part' }));
        }
      case 'toolCall':
        return new Prompt.ToolCallPart({
          id: block.toolCallId,
          name: block.name,
          params: JSON.parse(block.input),
        });
      case 'reference':
        // TODO(dmaretskyi): Consider inlining content.
        return new Prompt.TextPart({
          text: `<object>${block.reference}</object>`,
        });
      case 'transcript':
        return new Prompt.TextPart({
          text: block.text,
        });
      case 'status':
        return new Prompt.TextPart({
          text: `<status>${block.statusText}</status>`,
        });
      case 'suggestion':
        return new Prompt.TextPart({
          text: `<suggestion>${block.text}</suggestion>`,
        });
      case 'select':
        return new Prompt.TextPart({
          text: `<select>${block.options.map((option) => `<option>${option}</option>`).join('')}</select>`,
        });
      case 'anchor':
        // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
        return undefined;
      case 'proposal':
        return new Prompt.TextPart({
          text: `<proposal>${block.text}</proposal>`,
        });
      case 'toolkit':
        return new Prompt.TextPart({
          text: '<toolkit/>',
        });
      case 'json':
        return new Prompt.TextPart({
          text: block.data,
        });
      case 'toolResult':
      case 'image':
      case 'file':
        // TODO(burdon): Just log and ignore?
        return yield* Effect.fail(new PromptPreprocesorError({ message: `Invalid content block: ${block._tag}` }));
      case 'summary':
        break;
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
