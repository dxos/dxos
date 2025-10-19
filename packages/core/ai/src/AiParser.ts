//
// Copyright 2025 DXOS.org
//

import type * as Response from '@effect/ai/Response';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';

import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
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

  /**
   * Block reference to an object.
   */
  OBJECT = 'object',
  SUGGESTION = 'suggestion',
  PROPOSAL = 'proposal',
  SELECT = 'select',
  TOOLKIT = 'toolkit',
}

export interface ParseResponseCallbacks {
  /**
   * Called when the stream begins.
   */
  onBegin: () => Effect.Effect<void>;

  /**
   * Called on every part received from the stream.
   */
  onPart: (part: Response.StreamPart<any>) => Effect.Effect<void>;

  /**
   * Called on every partial or completed content block.
   * Partial blocks will have `pending` set to `true`.
   * For each block this will be called 0..n times with a pending block and then once with the final state of the block.
   *
   * Example:
   *  1. { pending: true, text: "Hello"}
   *  2. { pending: true, text: "Hello, I am a"}
   *  3. { pending: false, text: "Hello, I am a helpful assistant!"}
   */
  onBlock: (block: ContentBlock.Any) => Effect.Effect<void>;

  /**
   * Called when the stream ends.
   */
  onEnd: (block: ContentBlock.Summary) => Effect.Effect<void>;
}

export interface ParseResponseOptions extends ParseResponseCallbacks {
  /**
   * Whether to parse reasoning tags: <cot> and <think>.
   */
  parseReasoningTags: boolean;
}

/**
 * Transforms the Response stream into a stream of complete ContentBlock messages.
 * Partial blocks are emitted to support streaming to the UI.
 */
export const parseResponse =
  ({
    parseReasoningTags = false,
    onBegin = Function.constant(Effect.void),
    onPart = Function.constant(Effect.void),
    onBlock = Function.constant(Effect.void),
    onEnd = Function.constant(Effect.void),
  }: Partial<ParseResponseOptions> = {}) =>
  <E, R>(input: Stream.Stream<Response.StreamPart<any>, E, R>): Stream.Stream<ContentBlock.Any, E, R> =>
    Stream.asyncPush(
      Effect.fnUntraced(function* (emit) {
        const transformer = new StreamTransform();
        const start = Date.now();

        /** Stack of open tags. */
        const tagStack: StreamBlock[] = [];
        const summary: ContentBlock.Summary = {
          _tag: 'summary',
        };

        /** Current partial block used to accumulate content. */
        let current: StreamBlock | undefined;
        let block: ContentBlock.Any | undefined;
        let blocks = 0;
        let parts = 0;
        let toolCalls = 0;

        const emitPartialContentBlock = Effect.fnUntraced(function* (block: ContentBlock.Any) {
          yield* onBlock({ ...block });
          blocks++;
        });

        const emitFullBlock = Effect.fnUntraced(function* (block: ContentBlock.Any) {
          log('block', { block });
          if (block.pending === false) {
            delete block.pending;
          }
          yield* onBlock(block);
          emit.single(block);
          blocks++;
        });

        const emitPartialBlock = Effect.fnUntraced(function* (block: StreamBlock) {
          const content = makeContentBlock(block, { parseReasoningTags });
          if (content) {
            content.pending = true;
            yield* emitPartialContentBlock(content);
          }
        });

        const emitStreamBlock = Effect.fnUntraced(function* (block: StreamBlock) {
          const content = makeContentBlock(block, { parseReasoningTags });
          if (content) {
            yield* emitFullBlock(content);
          }
          current = undefined;
        });

        const flushText = Effect.fnUntraced(function* () {
          if (current) {
            yield* emitStreamBlock(current);
          }
        });

        log('begin');
        yield* onBegin();
        yield* Stream.runForEach(
          input,
          Effect.fnUntraced(function* (part) {
            log('part', { type: part.type, part });
            yield* onPart(part);
            switch (part.type) {
              case 'text-start': {
                // no-op
                break;
              }

              case 'text-delta': {
                const chunks = transformer.transform(part.delta);
                for (const chunk of chunks) {
                  log('text_chunk', { type: current?.type, chunk });
                  switch (current?.type) {
                    //
                    // XML Fragment.
                    //
                    case 'tag': {
                      if (chunk.type === 'tag') {
                        if (chunk.selfClosing) {
                          current.content.push(chunk);
                        } else if (chunk.closing) {
                          if (tagStack.length > 0) {
                            const top = tagStack.pop();
                            invariant(top && top.type === 'tag');
                            log('pop', { top });
                            top.content.push(current);
                            current = top;
                          } else {
                            yield* emitStreamBlock(current);
                            current = undefined;
                          }
                        } else {
                          tagStack.push(current);
                          current = chunk;
                        }
                      } else {
                        // Append text.
                        if (current.content.length === 0) {
                          current.content.push(chunk);
                        } else {
                          const last = current.content.at(-1);
                          invariant(last);
                          if (last.type === 'text') {
                            last.content += chunk.content;
                          } else {
                            current.content.push(chunk);
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
                        yield* emitStreamBlock(current);
                        if (chunk.selfClosing) {
                          yield* emitStreamBlock(chunk);
                          current = undefined;
                        } else {
                          current = chunk;
                        }
                      } else {
                        // Append text.
                        current.content += chunk.content;
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
                        current = chunk;
                      }
                    }
                  }
                }

                if (current) {
                  yield* emitPartialBlock(current);
                }
                break;
              }

              case 'text-end': {
                yield* flushText();
                break;
              }

              case 'tool-params-start': {
                // NOTE: Effect-ai outputs both streamed and parsed tool calls. We ignore the streamed version for now.
                // invariant(!block);
                // block = {
                //   _tag: 'toolCall',
                //   toolCallId: part.id,
                //   name: part.name,
                //   input: '',
                //   pending: true,
                //   providerExecuted: part.providerExecuted,
                // } satisfies ContentBlock.ToolCall;
                // yield* onBlock(block);
                break;
              }

              case 'tool-params-delta': {
                // invariant(block?._tag === 'toolCall');
                // block.input += part.delta;
                // yield* onBlock(block);
                break;
              }

              case 'tool-params-end': {
                // invariant(block?._tag === 'toolCall');
                // block.pending = false;
                // yield* emitFullBlock(block);
                // block = undefined;
                break;
              }

              case 'tool-call': {
                yield* emitFullBlock({
                  _tag: 'toolCall',
                  toolCallId: part.id,
                  name: part.name,
                  input: JSON.stringify(part.params),
                  providerExecuted: part.providerExecuted,
                } satisfies ContentBlock.ToolCall);
                toolCalls++;
                break;
              }

              case 'tool-result': {
                yield* emitFullBlock({
                  _tag: 'toolResult',
                  toolCallId: part.id,
                  name: part.name,
                  result: JSON.stringify(part.result),
                  providerExecuted: part.providerExecuted,
                } satisfies ContentBlock.ToolResult);
                break;
              }

              case 'reasoning-start': {
                invariant(!block);
                block = {
                  _tag: 'reasoning',
                  reasoningText: '',
                  pending: true,
                } satisfies ContentBlock.Reasoning;
                if (part.metadata.anthropic?.type === 'thinking') {
                  block.signature = part.metadata.anthropic.signature;
                }
                if (part.metadata.anthropic?.type === 'redacted_thinking') {
                  block.redactedText = part.metadata.anthropic.redactedData;
                }
                yield* emitPartialContentBlock(block);
                break;
              }
              case 'reasoning-delta': {
                invariant(block?._tag === 'reasoning');
                block.reasoningText += part.delta;
                yield* emitPartialContentBlock(block);
                break;
              }
              case 'reasoning-end': {
                invariant(block?._tag === 'reasoning');
                block.pending = false;
                yield* emitFullBlock(block);
                block = undefined;
                break;
              }

              case 'source': {
                yield* flushText();
                // TODO(dmaretskyi): Handle sources.
                break;
              }

              case 'response-metadata': {
                yield* flushText();
                summary.model = Option.getOrUndefined(part.modelId);
                log('metadata', { metadata: part });
                break;
              }

              case 'finish': {
                yield* flushText();
                const { inputTokens, outputTokens, totalTokens } = part.usage;
                summary.duration = Date.now() - start;
                summary.message = 'OK'; // part.reason;
                summary.toolCalls = toolCalls;
                summary.usage = {
                  inputTokens,
                  outputTokens,
                  totalTokens,
                };
                yield* emitFullBlock({
                  ...summary,
                  _tag: 'summary',
                } satisfies ContentBlock.Summary);
                log('finish', { finish: part });
                break;
              }

              default: {
                log.warn('llm stream part ignored', { part: part.type });
                break;
              }
            }

            parts++;
          }),
        );

        yield* flushText();
        log('end', { blocks, parts, summary });
        yield* onEnd(summary);
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

        case ModelTags.OBJECT: {
          return parseObjectBlock(block);
        }

        case ModelTags.ARTIFACT: {
          log.warn('artifact tags not implemented', { block });
          return undefined;
        }

        case ModelTags.SUGGESTION: {
          if (block.content.length === 1 && block.content[0].type === 'text') {
            return {
              _tag: 'suggestion',
              text: block.content[0].content,
            } satisfies ContentBlock.Suggestion;
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

        case ModelTags.TOOLKIT: {
          return {
            _tag: 'toolkit',
          } satisfies ContentBlock.Toolkit;
        }
      }

      return undefined;
    }
  }
};

const parseObjectBlock = (block: StreamBlock): ContentBlock.Reference | undefined => {
  if (block.type !== 'tag') {
    return undefined;
  }

  // <object dxn="..." />
  if (typeof block.attributes?.dxn === 'string') {
    try {
      return {
        _tag: 'reference',
        reference: Ref.fromDXN(DXN.parse(block.attributes.dxn)),
      };
    } catch {}
  }

  // <object id="..." />
  if (typeof block.attributes?.id === 'string') {
    try {
      return {
        _tag: 'reference',
        reference: Ref.fromDXN(DXN.fromLocalObjectId(block.attributes.id)),
      };
    } catch {}
  }

  // <object>dxn:...</object>
  if (block.content.length === 1 && block.content[0].type === 'text') {
    try {
      return {
        _tag: 'reference',
        reference: Ref.fromDXN(DXN.parse(block.content[0].content)),
      };
    } catch {}
  }

  // <object><dxn>...</dxn></object>
  const dxnTag = block.content.find((content) => content.type === 'tag' && content.tag === 'dxn');
  if (dxnTag && dxnTag.type === 'tag' && dxnTag.content.length === 1 && dxnTag.content[0].type === 'text') {
    try {
      return {
        _tag: 'reference',
        reference: Ref.fromDXN(DXN.parse(dxnTag.content[0].content)),
      };
    } catch {}
  }

  return undefined;
};
