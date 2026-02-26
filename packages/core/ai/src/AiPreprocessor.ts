//
// Copyright 2025 DXOS.org
//

import * as Prompt from '@effect/ai/Prompt';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Predicate from 'effect/Predicate';
import * as TokenX from 'tokenx';

import { log } from '@dxos/log';
import { ContentBlock, type Message } from '@dxos/types';
import { bufferToArray } from '@dxos/util';

import { PromptPreprocessingError as PromptPreprocesorError } from './errors';
import { flow, pipe } from 'effect/Function';

export type CacheControl = 'no-cache' | 'ephemeral';

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
  messages: readonly Message.Message[],
  opts?: { system?: string; cacheControl?: CacheControl },
) => Effect.Effect<Prompt.Prompt, PromptPreprocesorError, never> = Effect.fn('preprocessPrompt')(function* (
  messages,
  { system, cacheControl = 'no-cache' } = {},
) {
  return yield* Function.pipe(
    messages,
    applySummaryTrimming,
    Effect.map(groupAssistantMessages),
    Effect.flatMap(
      Effect.forEach(
        Effect.fnUntraced(function* (msg) {
          switch (msg.sender.role) {
            case 'user':
              return [
                Prompt.makeMessage('user', {
                  content: yield* Function.pipe(
                    msg.blocks,
                    Effect.forEach(convertUserMessagePart),
                    Effect.map(Array.filter(Predicate.isNotUndefined)),
                  ),
                }),
              ];
            case 'assistant':
              return [
                Prompt.makeMessage('assistant', {
                  content: yield* Function.pipe(
                    msg.blocks,
                    Effect.forEach(convertAssistantMessagePart),
                    Effect.map(Array.filter(Predicate.isNotUndefined)),
                  ),
                }),
              ];

            case 'tool':
              return [
                Prompt.makeMessage('tool', {
                  content: yield* Function.pipe(
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
    ),
    Effect.map(Array.flatten),
    Effect.map(Array.filter((_) => _.content.length > 0)),
    Effect.map(Prompt.fromMessages),
    Effect.map(fixMissingToolResults),
    Effect.map(system ? Prompt.setSystem(system) : Function.identity),
    Effect.map(setCacheControl(cacheControl)),
  );
});

/**
 * Fast regex-based token estimation.
 * This is only an approximation and might differ from the actual token count.
 */
export const estimateTokens: (prompt: Prompt.Prompt) => Effect.Effect<number> = Effect.fn('estimateTokens')(
  function* (prompt) {
    let totalTokens = 0;

    for (const message of prompt.content) {
      totalTokens += MESSAGE_DELIMITER_TOKENS;

      switch (message.role) {
        case 'system': {
          totalTokens += TokenX.estimateTokenCount(message.content);
          break;
        }
        case 'user':
        case 'assistant': {
          for (const part of message.content) {
            totalTokens += estimatePartTokens(part);
          }
          break;
        }
        case 'tool': {
          for (const part of message.content) {
            totalTokens += TokenX.estimateTokenCount(part.name);
            totalTokens += TokenX.estimateTokenCount(JSON.stringify(part.result));
          }
          break;
        }
      }
    }

    totalTokens += REPLY_PRIMING_TOKENS;

    return totalTokens;
  },
);

/** Per-message overhead for role/start/end delimiter tokens. */
const MESSAGE_DELIMITER_TOKENS = 4;

/** Overhead for the assistant reply priming at the end of a prompt. */
const REPLY_PRIMING_TOKENS = 3;

const estimatePartTokens = (part: Prompt.UserMessagePart | Prompt.AssistantMessagePart): number => {
  switch (part.type) {
    case 'text':
    case 'reasoning':
      return TokenX.estimateTokenCount(part.text);
    case 'tool-call':
      return TokenX.estimateTokenCount(part.name) + TokenX.estimateTokenCount(JSON.stringify(part.params));
    case 'tool-result':
      return TokenX.estimateTokenCount(part.name) + TokenX.estimateTokenCount(JSON.stringify(part.result));
    case 'file':
      return 0;
  }
};

/**
 * Finds the last message containing a summary block and trims the conversation accordingly.
 * If the summary is in an assistant message, all prior messages and non-summary blocks are removed.
 * If the summary is in a user or tool message, an error is raised.
 */
const applySummaryTrimming: (
  messages: readonly Message.Message[],
) => Effect.Effect<readonly Message.Message[], PromptPreprocesorError, never> = Effect.fn('applySummaryTrimming')(
  function* (messages) {
    let lastSummaryIndex = -1;
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      if (messages[idx].blocks.some(ContentBlock.is('summary'))) {
        lastSummaryIndex = idx;
        break;
      }
    }

    if (lastSummaryIndex === -1) {
      return messages;
    }

    const summaryMessage = messages[lastSummaryIndex];

    if (summaryMessage.sender.role !== 'assistant') {
      return yield* Effect.fail(
        new PromptPreprocesorError({
          message: `Summary blocks are only allowed in assistant messages, found in "${summaryMessage.sender.role}" message.`,
        }),
      );
    }

    const trimmedSummaryMessage: Message.Message = {
      ...summaryMessage,
      blocks: summaryMessage.blocks.filter(ContentBlock.is('summary')),
    };

    return [trimmedSummaryMessage, ...messages.slice(lastSummaryIndex + 1)];
  },
);

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
          isFailure: false,
          providerExecuted: false,
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
      case 'reasoning': {
        const anthropicOptions = block.redactedText
          ? { type: 'redacted_thinking' as const, redactedData: block.redactedText }
          : block.signature
            ? { type: 'thinking' as const, signature: block.signature }
            : undefined;
        return Prompt.makePart('reasoning', {
          text: block.reasoningText ?? '',
          ...(anthropicOptions ? { options: { anthropic: anthropicOptions } } : {}),
        });
      }

      case 'toolCall':
        return Prompt.makePart('tool-call', {
          id: block.toolCallId,
          name: block.name,
          params: block.input === '' ? {} : JSON.parse(block.input),
          providerExecuted: block.providerExecuted,
        });
      case 'toolResult':
        return Prompt.makePart('tool-result', {
          id: block.toolCallId,
          name: block.name,
          result: block.error ?? (block.result ? JSON.parse(block.result) : {}),
          isFailure: false,
          providerExecuted: false,
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
      case 'summary':
        return Prompt.makePart('text', {
          text: `<summary>${block.content}</summary>`,
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
      case 'stats':
        break;
      default:
        // Ignore spurious tags.
        log.warn('ignoring spurious tag', { block });
        return undefined;
    }
  },
);

const mergeMessages = (messages: Message.Message[]): Message.Message => ({
  ...messages[0],
  blocks: messages.flatMap((msg) => msg.blocks),
});

/**
 * Detects missing tool call results which can arise due to the conversation being interrupted.
 * Notifies the model to retry the tool call.
 */
const fixMissingToolResults = (prompt: Prompt.Prompt): Prompt.Prompt => {
  let result: Prompt.Message[] = [];
  for (let messageIndex = 0; messageIndex < prompt.content.length; messageIndex++) {
    const message = prompt.content[messageIndex];
    if (message.role !== 'assistant') {
      result.push(message);
      continue;
    }

    const unsatisfiedToolCalls: Prompt.ToolCallPart[] = [];
    let startPartIndex = 0;
    for (let partIndex = 0; partIndex < message.content.length; partIndex++) {
      const part = message.content[partIndex];
      if (part.type === 'tool-call' && !part.providerExecuted) {
        unsatisfiedToolCalls.push(part);
      } else if (part.type === 'tool-result' && !part.providerExecuted) {
        const idx = unsatisfiedToolCalls.findIndex((call) => call.id === part.id);
        if (idx !== -1) {
          unsatisfiedToolCalls.splice(idx, 1);
        }
      } else {
        if (unsatisfiedToolCalls.length > 0) {
          // Insert first part of the assistant message before the current part.
          result.push(
            Prompt.makeMessage('assistant', {
              content: message.content.slice(startPartIndex, partIndex),
            }),
          );
          startPartIndex = partIndex;

            // Insert missing tool results.
            result.push(
              Prompt.makeMessage('tool', {
                content: unsatisfiedToolCalls.map((call) =>
                  Prompt.makePart('tool-result', {
                    id: call.id,
                    name: call.name,
                    result:
                      'Tool result is missing from the conversation. This is likely a bug in the agent framework. Retry tool call; try calling tools one by one.',
                    isFailure: true,
                    providerExecuted: false,
                  }),
                ),
              }),
            );
            unsatisfiedToolCalls.length = 0;
          }
        }
      }

    if (unsatisfiedToolCalls.length > 0) {
      // Insert first part of the assistant message before the current part.
      result.push(
        Prompt.makeMessage('assistant', {
          content: message.content.slice(startPartIndex, message.content.length),
        }),
      );
      startPartIndex = message.content.length;

      // Insert missing tool results.
      result.push(
        Prompt.makeMessage('tool', {
          content: unsatisfiedToolCalls.map((call) =>
            Prompt.makePart('tool-result', {
              id: call.id,
              name: call.name,
              result:
                'Tool result is missing from the conversation. This is likely a bug in the agent framework. Retry tool call; try calling tools one by one.',
              isFailure: true,
              providerExecuted: false,
            }),
          ),
        }),
      );
    }

    if (startPartIndex < message.content.length) {
      result.push(
        Prompt.makeMessage('assistant', {
          content: message.content.slice(startPartIndex),
        }),
      );
    }
  }

  return Prompt.fromMessages(result);
};

/**
 * Groups consecutive assistant messages into a single message.
 */
const groupAssistantMessages: (messages: readonly Message.Message[]) => readonly Message.Message[] = flow(
  (messages) =>
    Array.isNonEmptyReadonlyArray(messages)
      ? Array.groupWith((a: Message.Message, b: Message.Message) => a.sender.role === b.sender.role)(messages)
      : [],
  Array.map(mergeMessages),
);

const setCacheControl: (cacheControl: CacheControl) => (prompt: Prompt.Prompt) => Prompt.Prompt =
  (cacheControl) => (prompt) => {
    if (cacheControl === 'ephemeral') {
      return Prompt.fromMessages(
        prompt.content.map((message, index) =>
          index !== prompt.content.length - 1
            ? message
            : {
                ...message,
                options: {
                  anthropic: {
                    cacheControl: {
                      ttl: '5m',
                      type: 'ephemeral',
                    },
                  },
                },
              },
        ),
      );
    } else {
      return prompt;
    }
  };
