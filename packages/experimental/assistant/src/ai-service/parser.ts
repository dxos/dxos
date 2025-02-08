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
   * Message complete.
   */
  public message = new Event<Message>();

  /**
   * Complete block added to Message.
   */
  public block = new Event<Message>();

  /**
   * Update partial block (while streaming).
   */
  public update = new Event<{ message: Message; block: MessageContentBlock }>();

  /**
   * Current message.
   */
  private _message?: Message | undefined;

  // TODO(burdon): Clean-up.
  private _emitBlock(block: StreamBlock | undefined, content?: MessageContentBlock) {
    if (!block) {
      invariant(this._message);
      invariant(content);
      this._message.content.push(content);
      this.block.emit(this._message);
    } else {
      const messageBlock = createMessageBlock(block, content);
      if (messageBlock) {
        invariant(this._message);
        this._message.content.push(messageBlock);
        this.block.emit(this._message);
      }
    }
  }

  // TODO(burdon): Clean-up.
  private _emitUpdate(block: StreamBlock, content?: MessageContentBlock) {
    const messageBlock = createMessageBlock(block, content);
    if (messageBlock) {
      invariant(this._message);
      this.update.emit({ message: this._message, block: messageBlock });
    }
  }

  /**
   * Parse stream until end.
   */
  async parse(stream: GenerationStream) {
    const transformer = new StreamTransform();

    //
    //
    //
    //
    let content: MessageContentBlock | undefined;
    let current: StreamBlock | undefined; // TODO(burdon): Just acccumulate.

    for await (const event of stream) {
      log('event', { type: event.type, event });

      switch (event.type) {
        //
        // Messages.
        //

        case 'message_start': {
          this._message = createStatic(Message, {
            role: 'assistant',
            content: [],
          });
          this.message.emit(this._message);

          break;
        }

        case 'message_delta': {
          break;
        }

        case 'message_stop': {
          invariant(this._message);
          this._message = undefined;
          break;
        }

        //
        // Content blocks.
        //

        case 'content_block_start': {
          if (current) {
            log.warn('unterminated content block', { current });
            current = undefined;
          }

          // TODO(burdon): Parse initial content.
          log.info('content_block_start', { event });
          content = event.content;
          break;
        }

        case 'content_block_delta': {
          switch (event.delta.type) {
            //
            // Text
            //
            case 'text_delta': {
              const chunks = transformer.transform(event.delta.text);
              for (const chunk of chunks) {
                // log.info('text_delta', { chunk, current });

                switch (current?.type) {
                  //
                  // XML Fragment.
                  //
                  case 'tag': {
                    if (chunk.type === 'tag') {
                      if (chunk.selfClosing) {
                        current.content.push(chunk);
                      } else if (chunk.closing) {
                        this._emitBlock(current, content);
                        current = undefined;
                      } else {
                        // TODO(burdon): Nested XML?
                        log.warn('unhandled nested xml', { chunk });
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
                      this._emitBlock(current, content);
                      if (chunk.selfClosing) {
                        this._emitBlock(chunk, content);
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
                      this._emitBlock(chunk, content);
                    } else {
                      current = chunk;
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
              invariant(content);
              invariant(content.type === 'tool_use');
              content.inputJson ??= '';
              content.inputJson += event.delta.partial_json;

              // if (!current) {
              //   current = { type: 'json', content: event.delta.partial_json };
              // } else {
              //   // current.content += event.delta.partial_json;
              // }
              break;
            }
          }
          break;
        }

        case 'content_block_stop': {
          if (content?.type === 'tool_use') {
            content.input = safeParseJson(content.inputJson, {});
            this._emitBlock(undefined, content);
          } else if (current) {
            this._emitBlock(current, content);
            current = undefined;
          }
          break;
        }
      }

      if (current) {
        this._emitUpdate(current);
      }
    } // for.
  }
}

/**
 * Convert stream block to message content block.
 */
export const createMessageBlock = (block: StreamBlock, base?: MessageContentBlock): MessageContentBlock | undefined => {
  log('createMessageBlock', { block, base });

  switch (block.type) {
    //
    // Text
    //
    case 'text': {
      return { ...base, type: 'text', text: block.content };
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
                case 'text': {
                  return block.content;
                }

                default:
                  return null;
              }
            })
            .filter(isNotFalsy)
            .join('\n');

          return { ...base, type: 'text', disposition: 'cot', text: content };
        }

        // case 'artifact': {
        //   return { type: 'text', disposition: 'artifact' };
        // }
      }
      break;
    }

    //
    // JSON
    //
    case 'json': {
      return { ...base, type: 'json', disposition: 'artifact', json: block.content };
    }
  }
};
