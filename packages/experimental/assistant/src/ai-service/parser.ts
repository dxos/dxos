//
// Copyright 2025 DXOS.org
//

import { Message, type MessageContentBlock } from '@dxos/artifact';
import { Event } from '@dxos/async';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNotFalsy, safeParseJson } from '@dxos/util';

import { type GenerationStream } from './stream';
import { StreamTransform, type StreamBlock } from './transform';

/**
 * Parse mixed content of plain text, XML fragments, and JSON blocks.
 */
export class MixedStreamParser {
  /**
   * New message.
   */
  public message = new Event<Message>();

  /**
   * Complete block added to Message.
   */
  public block = new Event<MessageContentBlock>();

  /**
   * Update partial block (while streaming).
   */
  public update = new Event<MessageContentBlock>();

  /**
   * Current message.
   */
  private _message?: Message | undefined;

  private _emitBlock(contentBlock: MessageContentBlock, streamBlock?: StreamBlock) {
    const messageBlock = streamBlock ? mergeMessageBlock(contentBlock, streamBlock) : contentBlock;
    if (messageBlock) {
      if (messageBlock.type === 'text' && messageBlock.text.length === 0) {
        return;
      }

      invariant(this._message);
      this._message.content.push(messageBlock);
      this.block.emit(messageBlock);
    }
  }

  private _emitUpdate(contentBlock: MessageContentBlock, streamBlock: StreamBlock) {
    const messageBlock = mergeMessageBlock(contentBlock, streamBlock);
    if (messageBlock) {
      messageBlock.pending = true;
      this.update.emit(messageBlock);
    }
  }

  /**
   * Parse stream until end.
   */
  async parse(stream: GenerationStream) {
    const transformer = new StreamTransform();

    /**
     * Current content message block.
     */
    let contentBlock: MessageContentBlock | undefined;

    /**
     * Current partial block used to accumulate content.
     */
    let streamBlock: StreamBlock | undefined;
    let stack: StreamBlock[] = [];

    for await (const event of stream) {
      // log.info('event', { type: event.type, event });
      switch (event.type) {
        //
        // Messages.
        //

        case 'message_start': {
          if (this._message) {
            log.warn('unexpected message_start');
          }

          this._message = createStatic(Message, { role: 'assistant', content: [] });
          this.message.emit(this._message);
          break;
        }

        case 'message_delta': {
          if (!this._message) {
            log.warn('unexpected message_delta');
          }

          break;
        }

        case 'message_stop': {
          if (!this._message) {
            log.warn('unexpected message_stop');
          } else {
            this._message = undefined;
          }
          break;
        }

        //
        // Content blocks.
        //

        case 'content_block_start': {
          if (contentBlock) {
            log.warn('unexpected content_block_start', { content: contentBlock });
          }

          // TODO(burdon): Parse initial content (factor out from content_block_delta).
          contentBlock = event.content;
          break;
        }

        case 'content_block_delta': {
          if (!contentBlock) {
            log.warn('unexpected content_block_delta');
            break;
          }

          switch (event.delta.type) {
            //
            // Text
            //
            case 'text_delta': {
              const chunks = transformer.transform(event.delta.text);
              for (const chunk of chunks) {
                // log.info('text_delta', { chunk, current });

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
                          top.content.push(streamBlock);
                          streamBlock = top;
                        } else {
                          this._emitBlock(contentBlock, streamBlock);
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
                      this._emitBlock(contentBlock, streamBlock);
                      if (chunk.selfClosing) {
                        this._emitBlock(contentBlock, chunk);
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
                      this._emitBlock(contentBlock, chunk);
                    } else {
                      streamBlock = chunk;
                    }
                  }
                }
              }
              break;
            }

            //
            // JSON
            //
            case 'input_json_delta': {
              if (!contentBlock) {
                log.warn('unexpected input_json_delta', { contentBlock });
                break;
              }

              if (streamBlock?.type === 'json') {
                streamBlock.content += event.delta.partial_json;
              } else {
                streamBlock = { type: 'json', content: event.delta.partial_json };
              }
              break;
            }
          }
          break;
        }

        case 'content_block_stop': {
          if (!contentBlock) {
            log.warn('unexpected content_block_stop');
            break;
          }

          this._emitBlock(contentBlock, streamBlock);
          contentBlock = undefined;
          streamBlock = undefined;
          break;
        }
      }

      if (contentBlock && streamBlock) {
        this._emitUpdate(contentBlock, streamBlock);
      }
    } // for.
  }
}

/**
 * Convert stream block to message content block.
 */
export const mergeMessageBlock = (
  contentBlock: MessageContentBlock,
  streamBlock: StreamBlock,
): MessageContentBlock | undefined => {
  log('mergeMessageBlock', { contentBlock, streamBlock });

  switch (streamBlock.type) {
    //
    // Text
    //
    case 'text': {
      return { ...contentBlock, type: 'text', text: streamBlock.content };
    }

    //
    // XML
    //
    case 'tag': {
      switch (streamBlock.tag) {
        case 'cot': {
          const content = streamBlock.content
            .map((block) => {
              switch (block.type) {
                case 'text':
                  return block.content;
                default:
                  return null;
              }
            })
            .filter(isNotFalsy)
            .join('\n');

          return { ...contentBlock, type: 'text', disposition: 'cot', text: content };
        }

        case 'artifact': {
          const { attributes } = streamBlock;
          return { type: 'json', disposition: 'artifact', json: JSON.stringify(attributes) };
        }

        case 'suggest': {
          if (streamBlock.content.length === 1 && streamBlock.content[0].type === 'text') {
            return {
              type: 'json',
              disposition: 'suggest',
              json: JSON.stringify({ text: streamBlock.content[0].content }),
            };
          }
        }

        case 'select': {
          return {
            type: 'json',
            disposition: 'select',
            json: JSON.stringify({
              options: streamBlock.content.flatMap((c) =>
                c.type === 'tag' && c.content.length === 1 && c.content[0].type === 'text'
                  ? [c.content[0].content]
                  : [],
              ),
            }),
          };
        }
      }
      break;
    }

    //
    // JSON
    //
    case 'json': {
      switch (contentBlock.type) {
        case 'tool_use': {
          return { ...contentBlock, input: safeParseJson(streamBlock.content) ?? '{}' };
        }
      }

      return { ...contentBlock, type: 'json', disposition: 'artifact', json: streamBlock.content };
    }
  }
};
