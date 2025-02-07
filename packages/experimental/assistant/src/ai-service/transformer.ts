//
// Copyright 2025 DXOS.org
//

import * as P from 'parsimmon';

import { log } from '@dxos/log';

export type StreamBlock =
  | {
      type: 'xml';
      tag: string;
      attributes?: Record<string, string>;
      content: StreamBlock[];
      closing?: boolean;
      selfClosing?: boolean;
    }
  | { type: 'text'; content: string }
  | { type: 'json'; content: string };

const textChunk: P.Parser<StreamBlock> = P.regexp(/[^<]+/).map((content) => ({
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

const selfClosingTag: P.Parser<StreamBlock> = P.seqMap(
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

const openTag: P.Parser<StreamBlock> = P.seqMap(
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

const closingTag: P.Parser<StreamBlock> = P.seqMap(
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

const mixedChunk: P.Parser<StreamBlock> = P.alt(selfClosingTag, openTag, closingTag, textChunk);

/**
 * Permissive streaming transformer that processes mixed content (plain text and XML fragments) from the AI service.
 */
export class StreamTransformer {
  private _buffer = '';

  transform(chunk: string): StreamBlock[] {
    log('chunk', { chunk });
    this._buffer += chunk;

    const results: StreamBlock[] = [];
    const parser = mixedChunk.many();
    const parseResult = parser.parse(this._buffer);
    if (parseResult.status) {
      for (const value of parseResult.value) {
        // Skip if empty line.
        if (value.type === 'text' && value.content.length === 0) {
          continue;
        }

        results.push(value);
      }

      this._buffer = '';
    }

    return results;
  }

  flush(): StreamBlock[] {
    const remaining = this._buffer;
    this._buffer = '';
    return remaining.length > 0 ? [{ type: 'text', content: remaining }] : [];
  }
}
