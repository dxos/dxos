//
// Copyright 2025 DXOS.org
//

import { Prompt } from '@effect/ai';
import { Array, Effect, Predicate, pipe } from 'effect';

import { log } from '@dxos/log';
import { type ContentBlock, type DataType } from '@dxos/schema';
import { bufferToArray } from '@dxos/util';

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
  opts?: { system?: string },
) => Effect.Effect<Prompt.Prompt, PromptPreprocesorError, never> = Effect.fn('preprocessPrompt')(function* (
  messages,
  { system } = {},
) {
  let prompt = yield* pipe(
    messages,
    Effect.forEach(
      Effect.fnUntraced(function* (msg) {
        switch (msg.sender.role) {
          case 'user':
            return [
              Prompt.makeMessage('user', {
                content: yield* pipe(
                  msg.blocks,
                  Effect.forEach(convertUserMessagePart),
                  Effect.map(Array.filter(Predicate.isNotUndefined)),
                ),
              }),
            ];
          case 'assistant':
            return [
              Prompt.makeMessage('assistant', {
                content: yield* pipe(
                  msg.blocks,
                  Effect.forEach(convertAssistantMessagePart),
                  Effect.map(Array.filter(Predicate.isNotUndefined)),
                ),
              }),
            ];

          case 'tool':
            return [
              Prompt.makeMessage('tool', {
                content: yield* pipe(
                  msg.blocks,
                  Effect.forEach(convertToolMessagePart),
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
    Effect.map(Prompt.fromMessages),
  );

  if (system) {
    prompt = Prompt.setSystem(prompt, system);
  }

  return prompt;
});

const convertUserMessagePart: (
  block: ContentBlock.Any,
) => Effect.Effect<Prompt.UserMessagePart | undefined, PromptPreprocesorError, never> = Effect.fnUntraced(
  function* (block) {
    switch (block._tag) {
      case 'text':
        return Prompt.makePart('text', {
          text: block.text,
        });
      case 'reference':
        // TODO(dmaretskyi): Consider inlining content.
        return Prompt.makePart('text', {
          text: `<object>${block.reference}</object>`,
        });
      case 'transcript':
        return Prompt.makePart('text', {
          text: block.text,
        });
      case 'anchor':
        // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
        return undefined;
      case 'image':
        switch (block.source?.type) {
          case 'base64':
            return Prompt.makePart('file', {
              mediaType: block.source.mediaType,
              data: bufferToArray(Buffer.from(block.source.data, 'base64')),
            });
          case 'http':
            return Prompt.makePart('file', {
              data: new URL(block.source.url),
              mediaType: 'application/octet-stream', // Likely doesn't work.
            });
          default:
            return yield* Effect.fail(new PromptPreprocesorError({ message: 'Invalid image source' }));
        }
      case 'file':
        // TODO(dmaretskyi): Convert data URIs into Prompt.FilePart
        return Prompt.makePart('file', {
          data: new URL(block.url),
          mediaType: block.mediaType ?? 'application/octet-stream',
        });
      case 'toolResult':
        return yield* Effect.fail(
          new PromptPreprocesorError({
            message: `Tool results are not supported inside user messages, use "tool" actor instead.`,
          }),
        );
      default:
        return yield* Effect.fail(new PromptPreprocesorError({ message: `Invalid user content block: ${block._tag}` }));
    }
  },
);

export const convertToolMessagePart: (
  block: ContentBlock.Any,
) => Effect.Effect<Prompt.ToolMessagePart | undefined, PromptPreprocesorError, never> = Effect.fnUntraced(
  function* (block) {
    switch (block._tag) {
      case 'toolResult':
        return Prompt.makePart('tool-result', {
          id: block.toolCallId,
          name: block.name,
          result: block.error ?? (block.result ? JSON.parse(block.result) : {}),
        });
      default:
        return yield* Effect.fail(new PromptPreprocesorError({ message: `Invalid tool content block: ${block._tag}` }));
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
        return Prompt.makePart('text', {
          text: block.text,
        });
      case 'reasoning':
        return Prompt.makePart('reasoning', {
          text: block.reasoningText ?? '',
          options: {
            anthropic: block.redactedText
              ? {
                  type: 'redacted_thinking',
                  redactedData: block.redactedText,
                }
              : {
                  type: 'thinking',
                  signature:
                    block.signature ??
                    (yield* Effect.fail(new PromptPreprocesorError({ message: 'Invalid reasoning part' }))),
                },
          },
        });

      case 'toolCall':
        return Prompt.makePart('tool-call', {
          id: block.toolCallId,
          name: block.name,
          params: JSON.parse(block.input),
          providerExecuted: block.providerExecuted,
        });
      case 'toolResult':
        return Prompt.makePart('tool-result', {
          id: block.toolCallId,
          name: block.name,
          result: block.error ?? (block.result ? JSON.parse(block.result) : {}),
        });

      case 'reference':
        // TODO(dmaretskyi): Consider inlining content.
        return Prompt.makePart('text', {
          text: `<object>${block.reference}</object>`,
        });
      case 'transcript':
        return Prompt.makePart('text', {
          text: block.text,
        });
      case 'status':
        return Prompt.makePart('text', {
          text: `<status>${block.statusText}</status>`,
        });
      case 'suggestion':
        return Prompt.makePart('text', {
          text: `<suggestion>${block.text}</suggestion>`,
        });
      case 'select':
        return Prompt.makePart('text', {
          text: `<select>${block.options.map((option) => `<option>${option}</option>`).join('')}</select>`,
        });
      case 'anchor':
        // TODO(dmaretskyi): Notify of artifact changes based on the version progression.
        return undefined;
      case 'proposal':
        return Prompt.makePart('text', {
          text: `<proposal>${block.text}</proposal>`,
        });
      case 'toolkit':
        return Prompt.makePart('text', {
          text: '<toolkit/>',
        });
      case 'json':
        return Prompt.makePart('text', {
          text: block.data,
        });
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
