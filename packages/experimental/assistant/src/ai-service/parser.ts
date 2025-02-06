//
// Copyright 2025 DXOS.org
//

import * as P from 'parsimmon';

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import { type GenerationStream } from './stream';

export type StreamChunk =
  | {
      type: 'xml';
      tag: string;
      attributes?: Record<string, string>;
      content: StreamChunk[];
      closing?: boolean;
      selfClosing?: boolean;
    }
  | { type: 'text'; content: string }
  | { type: 'json'; content: string };

const textChunk: P.Parser<StreamChunk> = P.regexp(/[^<]+/).map((content) => ({
  type: 'text',
  content,
}));

const attribute: P.Parser<[string, string]> = P.seq(
  P.regexp(/[a-zA-Z_][a-zA-Z0-9_-]*/),
  P.string('=').trim(P.optWhitespace),
  P.alt(
    P.regexp(/"[^"]*"/).map((s) => s.slice(1, -1)),
    P.regexp(/'[^']*'/).map((s) => s.slice(1, -1)),
  ),
).map(([name, _, value]) => [name, value]);

const tagName = P.regexp(/[a-zA-Z_][a-zA-Z0-9_-]*/);

const selfClosingTag: P.Parser<StreamChunk> = P.seqMap(
  P.string('<'),
  tagName,
  P.optWhitespace.then(attribute).many(),
  P.optWhitespace.then(P.string('/>')),
  (_, tag, attributes, __) => ({
    type: 'xml',
    tag,
    attributes: Object.fromEntries(attributes),
    content: [],
    selfClosing: true,
  }),
);

const openTag: P.Parser<StreamChunk> = P.seqMap(
  P.string('<'),
  tagName,
  P.optWhitespace.then(attribute).many(),
  P.string('>'),
  P.regexp(/[^<]*/),
  (_, tag, attributes, __, str) => {
    const content = str.trim();
    return {
      type: 'xml',
      tag,
      attributes: Object.fromEntries(attributes),
      content: content.length ? [{ type: 'text', content }] : [],
    };
  },
);

const closingTag: P.Parser<StreamChunk> = P.seqMap(
  //
  P.string('</'),
  tagName,
  P.string('>'),
  (_, tag) => ({
    type: 'xml',
    tag,
    content: [],
    closing: true,
  }),
);

const mixedChunk: P.Parser<StreamChunk> = P.alt(selfClosingTag, openTag, closingTag, textChunk);

/**
 * Permissive streaming transformer that can process mixed content of plain text and XML fragments.
 */
export class XMLStreamTransformer {
  private _buffer = '';

  transform(chunk: string): StreamChunk[] {
    log('chunk', { chunk });
    this._buffer += chunk;

    const results: StreamChunk[] = [];
    const parser = mixedChunk.many();
    const parseResult = parser.parse(this._buffer);
    if (parseResult.status) {
      for (const value of parseResult.value) {
        // Skip if empty line.
        if (value.type === 'text' && value.content.trim().length === 0) {
          continue;
        }

        results.push(value);
      }

      this._buffer = '';
    }

    return results;
  }

  flush(): StreamChunk[] {
    const remaining = this._buffer;
    this._buffer = '';
    return remaining.length > 0 ? [{ type: 'text', content: remaining }] : [];
  }
}

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
  public block = new Event<StreamChunk>();

  /**
   * Update current block (while streaming).
   */
  public update = new Event<StreamChunk>();

  async parse(stream: GenerationStream) {
    const transformer = new XMLStreamTransformer();
    let current: StreamChunk | undefined;

    for await (const event of stream) {
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
            this.block.emit(current);
          }

          current = undefined;
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
                log('chunk', { chunk });

                switch (current?.type) {
                  // XML Fragment.
                  case 'xml': {
                    if (chunk.type === 'xml') {
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
                          last.content = joinTrimmed(last.content, chunk.content);
                        } else {
                          current.content.push(chunk);
                        }
                      }
                    }
                    break;
                  }

                  // Text Fragment.
                  case 'text': {
                    if (chunk.type === 'xml') {
                      this.block.emit(current);
                      if (chunk.selfClosing) {
                        this.block.emit(chunk);
                        current = undefined;
                      } else {
                        current = chunk;
                      }
                    } else {
                      // Append text.
                      current.content = joinTrimmed(current.content, chunk.content);
                    }
                    break;
                  }

                  // No current node.
                  default: {
                    if (chunk.type === 'xml' && chunk.selfClosing) {
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
 * Trim whitespace preserving EOL characters.
 */
const trim = (input: string): string => {
  return input
    .split(/(\r\n|\n)/)
    .map((line, i) => {
      if (i % 2 === 1) {
        return line;
      }

      return line.replace(/^[\t ]+|[\t ]+$/g, '');
    })
    .join('');
};

/**
 * Join strings.
 */
const joinTrimmed = (a: string, b: string): string => {
  const trimmedA = trim(a);
  const trimmedB = trim(b);

  return /[\r\n]$/.test(trimmedA) ? trimmedA + trimmedB : trimmedA + ' ' + trimmedB;
};
