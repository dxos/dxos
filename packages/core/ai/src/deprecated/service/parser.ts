//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';
import { isNotFalsy, safeParseJson } from '@dxos/util';

import { type GenerationStream } from './service';
import { StreamTransform, type StreamBlock } from './transform';
import { type GenerationStreamEvent } from '../../types';

/**
 * Parse mixed content of plain text, XML fragments, and JSON blocks.
 */
export class MixedStreamParser {
  /**
   * New message.
   */
  public message = new Event<DataType.Message>();

  /**
   * Complete block added to Message.
   */
  public block = new Event<ContentBlock.Any>();

  /**
   * Update partial block (while streaming).
   */
  public update = new Event<ContentBlock.Any>();

  public streamEvent = new Event<GenerationStreamEvent>();

  /**
   * Current message.
   */
  private _message?: DataType.Message | undefined;

  private _emitBlock(contentBlock: ContentBlock.Any, streamBlock?: StreamBlock): void {
    const messageBlock = streamBlock ? mergeMessageBlock(contentBlock, streamBlock) : contentBlock;
    if (messageBlock) {
      if (messageBlock._tag === 'text' && messageBlock.text.length === 0) {
        return;
      }

      invariant(this._message);
      this._message.blocks.push(messageBlock);
      this.block.emit(messageBlock);
    }
  }

  private _emitUpdate(contentBlock: ContentBlock.Any, streamBlock: StreamBlock): void {
    const messageBlock = mergeMessageBlock(contentBlock, streamBlock);
    if (messageBlock) {
      messageBlock.pending = true;
      this.update.emit(messageBlock);
    }
  }

  /**
   * Parse stream until end.
   */
  async parse(stream: GenerationStream): Promise<DataType.Message[]> {
    const transformer = new StreamTransform();

    /**
     * Current content message block.
     */
    let contentBlock: ContentBlock.Any | undefined;

    /**
     * Current partial block used to accumulate content.
     */
    let streamBlock: StreamBlock | undefined;
    const stack: StreamBlock[] = [];

    const messagesCollected: DataType.Message[] = [];

    for await (const event of stream) {
      log('streamEvent', { event });
      this.streamEvent.emit(event);

      // log('event', { type: event.type, event });
      switch (event.type) {
        //
        // Messages.
        //

        case 'message_start': {
          if (this._message) {
            log.warn('unexpected message_start');
          }

          this._message = Obj.make(DataType.Message, {
            created: event.message.created,
            sender: event.message.sender,
            blocks: [...event.message.blocks],
          });
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
            messagesCollected.push(this._message);
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
                log('text_delta', { chunk });

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

    return messagesCollected;
  }
}

/**
 * Convert stream block to message content block.
 */
export const mergeMessageBlock = (
  contentBlock: ContentBlock.Any,
  streamBlock: StreamBlock,
): ContentBlock.Any | undefined => {
  log('mergeMessageBlock', { contentBlock, streamBlock });

  switch (streamBlock.type) {
    //
    // Text
    //
    case 'text': {
      return { ...contentBlock, _tag: 'text', text: streamBlock.content };
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

          return { ...contentBlock, _tag: 'text', disposition: 'cot', text: content };
        }

        case 'status': {
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

          return { ...contentBlock, _tag: 'text', disposition: 'status', text: content };
        }

        case 'artifact': {
          const { attributes } = streamBlock;
          return { _tag: 'json', disposition: 'artifact', data: JSON.stringify(attributes) };
        }

        case 'suggest': {
          if (streamBlock.content.length === 1 && streamBlock.content[0].type === 'text') {
            return {
              _tag: 'json',
              disposition: 'suggest',
              data: JSON.stringify({ text: streamBlock.content[0].content }),
            };
          }
          break;
        }

        case 'proposal': {
          if (streamBlock.content.length === 1 && streamBlock.content[0].type === 'text') {
            return {
              _tag: 'json',
              disposition: 'proposal',
              data: JSON.stringify({ text: streamBlock.content[0].content }),
            };
          }
          break;
        }

        case 'select': {
          return {
            _tag: 'json',
            disposition: 'select',
            data: JSON.stringify({
              options: streamBlock.content.flatMap((content) =>
                content.type === 'tag' && content.content.length === 1 && content.content[0].type === 'text'
                  ? [content.content[0].content]
                  : [],
              ),
            }),
          };
        }

        case 'tool-list': {
          return {
            _tag: 'json',
            disposition: 'tool_list',
            data: JSON.stringify({}),
          };
        }
      }

      break;
    }

    //
    // JSON
    //
    case 'json': {
      switch (contentBlock._tag) {
        case 'toolCall': {
          return { ...contentBlock, input: safeParseJson(streamBlock.content) ?? {} };
        }
      }

      return { ...contentBlock, _tag: 'json', disposition: 'artifact', data: streamBlock.content };
    }
  }
};
