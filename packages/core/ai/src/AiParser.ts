//
// Copyright 2025 DXOS.org
//

import { type AiResponse } from '@effect/ai';
import { Effect, Function, Predicate, Stream } from 'effect';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/schema';

import { type StreamBlock, StreamTransform } from './parser';

/**
 * Tags that are used by the model to indicate the type of content.
 *
 * NOTE: Keep in sync with system instructions.
 */
enum ModelTags {
  /**
   * Chain of thought.
   */
  COT = 'cot',

  /**
   * Chain of thought.
   * Used by DeepSeek.
   */
  THINK = 'think',

  STATUS = 'status',
  ARTIFACT = 'artifact',
  SUGGEST = 'suggest',
  PROPOSAL = 'proposal',
  SELECT = 'select',
  TOOL_LIST = 'tool-list',
}

export interface ParseResponseOptions {
  /**
   * Whether to parse reasoning tags: <cot> and <think>.
   */
  parseReasoningTags?: boolean;

  /**
   * Called when the stream begins.
   */
  onBegin?: () => Effect.Effect<void>;

  /**
   * Called on every part received from the stream.
   */
  onPart?: (part: AiResponse.Part) => Effect.Effect<void>;

  /**
   * Called on every partial or completed content block.
   * Partial blocks will have `pending` set to `true`.
   */
  onBlock?: (block: ContentBlock.Any) => Effect.Effect<void>;

  /**
   * Called when the stream ends.
   */
  onEnd?: () => Effect.Effect<void>;
}

/**
 * Transforms the AiResponse stream into a stream of complete ContentBlock messages.
 * Partial blocks are emitted to support streaming to the UI.
 */
export const parseResponse =
  ({
    parseReasoningTags = false,
    onBegin = Function.constant(Effect.void),
    onPart = Function.constant(Effect.void),
    onBlock = Function.constant(Effect.void),
    onEnd = Function.constant(Effect.void),
  }: ParseResponseOptions = {}) =>
  <E, R>(input: Stream.Stream<AiResponse.AiResponse, E, R>): Stream.Stream<ContentBlock.Any, E, R> =>
    Stream.asyncPush(
      Effect.fnUntraced(function* (emit) {
        const transformer = new StreamTransform();

        /**
         * Current partial block used to accumulate content.
         */
        let streamBlock: StreamBlock | undefined;
        const stack: StreamBlock[] = [];

        const emitFullBlock = Effect.fnUntraced(function* (block: ContentBlock.Any) {
          log.info('block', { block });
          yield* onBlock(block);
          emit.single(block);
        });

        const emitStreamBlock = Effect.fnUntraced(function* (block: StreamBlock) {
          const contentBlock = makeContentBlock(block, { parseReasoningTags });
          if (contentBlock) {
            yield* emitFullBlock(contentBlock);
          }
          streamBlock = undefined;
        });

        const flushText = Effect.fnUntraced(function* () {
          if (streamBlock) {
            yield* emitStreamBlock(streamBlock);
          }
        });

        const emitPartialBlock = Effect.fnUntraced(function* (block: StreamBlock) {
          const contentBlock = makeContentBlock(block, { parseReasoningTags });
          if (contentBlock) {
            contentBlock.pending = true;
            yield* onBlock(contentBlock);
          }
        });

        log.info('begin');
        yield* onBegin();

        yield* Stream.runForEach(
          input,
          Effect.fnUntraced(function* (response) {
            for (const part of response.parts) {
              log('part', { part });
              yield* onPart(part);
              switch (part._tag) {
                case 'TextPart': {
                  const chunks = transformer.transform(part.text);
                  for (const chunk of chunks) {
                    log('text_chunk', { chunk });
                    switch (streamBlock?.type) {
                      //
                      // XML Fragment.
                      //
                      case 'tag': {
                        if (chunk.type === 'tag') {
                          if (chunk.selfClosing) {
                            streamBlock.content.push(chunk);
                          } else if (chunk.closing) {
                            if (stack.length > 0) {
                              const top = stack.pop();
                              invariant(top && top.type === 'tag');
                              log('pop', { top });
                              top.content.push(streamBlock);
                              streamBlock = top;
                            } else {
                              yield* emitStreamBlock(streamBlock);
                              streamBlock = undefined;
                            }
                          } else {
                            stack.push(streamBlock);
                            streamBlock = chunk;
                          }
                        } else {
                          // Append text.
                          if (streamBlock.content.length === 0) {
                            streamBlock.content.push(chunk);
                          } else {
                            const last = streamBlock.content.at(-1);
                            invariant(last);
                            if (last.type === 'text') {
                              last.content += chunk.content;
                            } else {
                              streamBlock.content.push(chunk);
                            }
                          }
                        }
                        break;
                      }

                      //
                      // Text Fragment.
                      //
                      case 'text': {
                        if (chunk.type === 'tag') {
                          yield* emitStreamBlock(streamBlock);
                          if (chunk.selfClosing) {
                            yield* emitStreamBlock(chunk);
                            streamBlock = undefined;
                          } else {
                            streamBlock = chunk;
                          }
                        } else {
                          // Append text.
                          streamBlock.content += chunk.content;
                        }
                        break;
                      }

                      //
                      // No current chunk.
                      //
                      default: {
                        if (chunk.type === 'tag' && chunk.selfClosing) {
                          yield* emitStreamBlock(chunk);
                        } else {
                          streamBlock = chunk;
                        }
                      }
                    }
                  }

                  if (streamBlock) {
                    yield* emitPartialBlock(streamBlock);
                  }
                  break;
                }

                case 'ToolCallPart': {
                  yield* flushText();
                  yield* emitFullBlock({
                    _tag: 'toolCall',
                    toolCallId: part.id,
                    name: part.name,
                    input: part.params,
                  } satisfies ContentBlock.ToolCall);
                  break;
                }

                case 'ReasoningPart': {
                  yield* flushText();
                  const block: ContentBlock.Reasoning = {
                    _tag: 'reasoning',
                    reasoningText: part.reasoningText,
                  };
                  if (part.signature) {
                    block.signature = part.signature;
                  }
                  yield* emitFullBlock(block);
                  break;
                }

                case 'RedactedReasoningPart': {
                  yield* flushText();
                  yield* emitFullBlock({
                    _tag: 'reasoning',
                    redactedText: part.redactedText,
                  } satisfies ContentBlock.Reasoning);
                  break;
                }

                case 'MetadataPart': {
                  yield* flushText();
                  // TODO(dmaretskyi): Handling these would involve changing the signature of this transformer to emit a whole message.
                  log('metadata', { metadata: part });
                  break;
                }

                case 'FinishPart': {
                  yield* flushText();
                  // TODO(dmaretskyi): Handling these would involve changing the signature of this transformer to emit a whole message.
                  log('finish', { finish: part });
                  break;
                }
              }
            }
          }),
        );

        log.info('end');
        yield* flushText();
        yield* onEnd();
        emit.end();
      }),
    );

/**
 * @returns Content block made from stream block.
 */
const makeContentBlock = (
  block: StreamBlock,
  { parseReasoningTags }: Pick<ParseResponseOptions, 'parseReasoningTags'>,
): ContentBlock.Any | undefined => {
  switch (block.type) {
    //
    // Text
    //
    case 'text': {
      return {
        _tag: 'text',
        text: block.content,
      } satisfies ContentBlock.Text;
    }

    //
    // XML
    //
    case 'tag': {
      switch (block.tag) {
        case ModelTags.COT:
        case ModelTags.THINK: {
          const content = block.content
            .map((block) => {
              switch (block.type) {
                case 'text':
                  return block.content;
                default:
                  return null;
              }
            })
            .filter(Predicate.isTruthy)
            .join('\n');

          if (!parseReasoningTags) {
            return {
              _tag: 'text',
              text: content,
            } satisfies ContentBlock.Text;
          }
          return {
            _tag: 'reasoning',
            reasoningText: content,
          } satisfies ContentBlock.Reasoning;
        }

        case ModelTags.STATUS: {
          const content = block.content
            .map((block) => {
              switch (block.type) {
                case 'text':
                  return block.content;
                default:
                  return null;
              }
            })
            .filter(Predicate.isTruthy)
            .join('\n');

          return {
            _tag: 'status',
            statusText: content,
          } satisfies ContentBlock.Status;
        }

        case ModelTags.ARTIFACT: {
          log.warn('artifact tags not implemented', { block });
          break;
        }

        case ModelTags.SUGGEST: {
          if (block.content.length === 1 && block.content[0].type === 'text') {
            return {
              _tag: 'suggest',
              text: block.content[0].content,
            } satisfies ContentBlock.Suggest;
          }

          return undefined;
        }

        case ModelTags.PROPOSAL: {
          if (block.content.length === 1 && block.content[0].type === 'text') {
            return {
              _tag: 'proposal',
              text: block.content[0].content,
            } satisfies ContentBlock.Proposal;
          }

          return undefined;
        }

        case ModelTags.SELECT: {
          return {
            _tag: 'select',
            options: block.content.flatMap((content) =>
              content.type === 'tag' && content.content.length === 1 && content.content[0].type === 'text'
                ? [content.content[0].content]
                : [],
            ),
          } satisfies ContentBlock.Select;
        }

        case ModelTags.TOOL_LIST: {
          return {
            _tag: 'toolList',
          } satisfies ContentBlock.ToolList;
        }
      }

      return undefined;
    }
  }
};
