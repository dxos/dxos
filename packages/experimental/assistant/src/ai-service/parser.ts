//
// Copyright 2025 DXOS.org
//

import { type MessageContentBlock } from '@dxos/artifact';
import { Event } from '@dxos/async';
import { log } from '@dxos/log';
import { isNotFalsy } from '@dxos/util';

import { type GenerationStream } from './stream';
import { StreamTransform, type StreamBlock } from './transform';

/**
 * Parse mixed content of plain text, XML fragments, and JSON blocks.
 */
export class MixedStreamParser {
  /**
   * New message.
   */
  public message = new Event();

  /**
   * New block.
   */
  public block = new Event<StreamBlock>();

  /**
   * Update current block (while streaming).
   */
  public update = new Event<StreamBlock>();

  async parse(stream: GenerationStream) {
    const transformer = new StreamTransform();
    let current: StreamBlock | undefined;

    for await (const event of stream) {
      // log.info('event', { type: event.type, event });

      switch (event.type) {
        //
        // Messages.
        //

        case 'message_start': {
          this.message.emit();
          break;
        }

        case 'message_delta': {
          break;
        }

        case 'message_stop': {
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

          log.info('content_block_start', { event });
          if (event.content.type === 'tool_use') {
            current = { type: 'json', disposition: 'tool_use', content: '' };
          }
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
                        this.block.emit(current);
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
                        const last = current.content[current.content.length - 1];
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
                      this.block.emit(current);
                      if (chunk.selfClosing) {
                        this.block.emit(chunk);
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
                      this.block.emit(chunk);
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
              if (!current) {
                current = { type: 'json', content: event.delta.partial_json.trim() };
              } else {
                current.content += event.delta.partial_json.trim();
              }
              break;
            }
          }
          break;
        }

        case 'content_block_stop': {
          if (current) {
            this.block.emit(current);
            current = undefined;
          }
          break;
        }
      }

      if (current) {
        this.update.emit(current);
      }
    } // for.
  }
}

/**
 * Convert stream block to message content block.
 */
export const createMessageBlock = (block: StreamBlock): MessageContentBlock | undefined => {
  switch (block.type) {
    //
    // Text
    //
    case 'text': {
      return { type: 'text', text: block.content };
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

          return { type: 'text', disposition: 'cot', text: content };
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
      return { type: 'json', disposition: 'artifact', json: block.content };
    }
  }
};
