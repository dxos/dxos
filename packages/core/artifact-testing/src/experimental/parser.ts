import { StreamTransform, type StreamBlock } from '@dxos/ai';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { ContentBlock } from '@dxos/schema';
import type { AiError, AiResponse } from '@effect/ai';
import { Effect, Function, Predicate, Stream } from 'effect';

export interface ParseGptStreamOptions {
  onPart?: (part: AiResponse.Part) => Effect.Effect<void>;
}

/**
 * Parses the part stream into a set of complete message blocks.
 * Each block emitted is final.
 *
 * Callbacks can be provided to watch for incomplete blocks.
 */
export const parseGptStream =
  ({ onPart = Function.constant(Effect.void) }: ParseGptStreamOptions = {}) =>
  <E>(input: Stream.Stream<AiResponse.AiResponse, E, never>): Stream.Stream<ContentBlock.Any, E, never> =>
    Stream.asyncPush(
      Effect.fnUntraced(function* (emit) {
        const transformer = new StreamTransform();

        /**
         * Current partial block used to accumulate content.
         */
        let streamBlock: StreamBlock | undefined;
        const stack: StreamBlock[] = [];

        const emitStreamBlock = (block: StreamBlock) => {
          switch (block.type) {
            //
            // Text
            //
            case 'text': {
              emit.single({
                _tag: 'text',
                text: block.content,
              } satisfies ContentBlock.Text);
              break;
            }

            //
            // XML
            //
            case 'tag': {
              switch (block.tag) {
                case 'cot': {
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

                  emit.single({
                    _tag: 'reasoning',
                    reasoningText: content,
                  } satisfies ContentBlock.Reasoning);
                  break;
                }

                case 'status': {
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

                  emit.single({
                    _tag: 'status',
                    statusText: content,
                  } satisfies ContentBlock.Status);
                  break;
                }

                case 'artifact': {
                  log.warn('artifact tags not implemented', { block });
                  break;
                }

                case 'suggest': {
                  if (block.content.length === 1 && block.content[0].type === 'text') {
                    emit.single({
                      _tag: 'suggest',
                      text: block.content[0].content,
                    } satisfies ContentBlock.Suggest);
                  }
                  break;
                }

                case 'proposal': {
                  if (block.content.length === 1 && block.content[0].type === 'text') {
                    emit.single({
                      _tag: 'proposal',
                      text: block.content[0].content,
                    } satisfies ContentBlock.Proposal);
                  }
                  break;
                }

                case 'select': {
                  return emit.single({
                    _tag: 'select',
                    options: block.content.flatMap((content) =>
                      content.type === 'tag' && content.content.length === 1 && content.content[0].type === 'text'
                        ? [content.content[0].content]
                        : [],
                    ),
                  });
                }

                case 'tool-list': {
                  return emit.single({
                    _tag: 'toolList',
                  });
                }
              }

              break;
            }
          }
        };

        yield* Stream.runForEach(
          input,
          Effect.fnUntraced(function* (response) {
            for (const part of response.parts) {
              yield* onPart(part);
              switch (part._tag) {
                case 'TextPart': {
                  const chunks = transformer.transform(part.text);
                  for (const chunk of chunks) {
                    log.info('text_chunk', { chunk });
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
                              emitStreamBlock(streamBlock);
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
                          emitStreamBlock(streamBlock);
                          if (chunk.selfClosing) {
                            emitStreamBlock(chunk);
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
                          emitStreamBlock(chunk);
                        } else {
                          streamBlock = chunk;
                        }
                      }
                    }
                  }

                  emit.single({
                    _tag: 'text',
                    text: part.text,
                  } satisfies ContentBlock.Text);
                  break;
                }

                case 'ToolCallPart':
                  emit.single({
                    _tag: 'toolCall',
                    toolCallId: part.id,
                    name: part.name,
                    input: part.params,
                  } satisfies ContentBlock.ToolCall);
                  break;
                case 'ReasoningPart':
                  emit.single({
                    _tag: 'reasoning',
                    reasoningText: part.reasoningText,
                    signature: part.signature,
                  } satisfies ContentBlock.Reasoning);
                  break;
                case 'RedactedReasoningPart':
                  emit.single({
                    _tag: 'reasoning',
                    redactedText: part.redactedText,
                  } satisfies ContentBlock.Reasoning);
                  break;
                case 'MetadataPart':
                  // TODO(dmaretskyi): Handling these would involve changing the signature of this transformer to emit a whole message.
                  log.info('metadata', { metadata: part });
                  break;
                case 'FinishPart':
                  // TODO(dmaretskyi): Handling these would involve changing the signature of this transformer to emit a whole message.
                  log.info('finish', { finish: part });
                  break;
              }
            }
          }),
        );

        emit.end();
      }),
    );
