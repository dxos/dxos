//
// Copyright 2025 DXOS.org
//

import { parsimmon as P } from './parsimmon';

/**
 * Parsed block.
 */
export type StreamBlock =
  | {
      type: 'tag';
      tag: string;
      attributes?: Record<string, string>;
      content: StreamBlock[];
      closing?: boolean;
      selfClosing?: boolean;
    }
  | { type: 'text'; content: string }
  | { type: 'json'; disposition?: string; content: string };

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
  //
  P.string('<'),
  tagName,
  P.optWhitespace.then(attribute).many(),
  P.optWhitespace.then(P.string('/>')),
  P.optWhitespace,
  (_, tag, attributes, __) => ({
    type: 'tag',
    tag,
    attributes: Object.fromEntries(attributes),
    content: [],
    selfClosing: true,
  }),
);

const openTag: P.Parser<StreamBlock> = P.seqMap(
  //
  P.string('<'),
  tagName,
  P.optWhitespace.then(attribute).many(),
  P.string('>'),
  P.regexp(/[^<]*/),
  (_, tag, attributes, __, content) => ({
    type: 'tag',
    tag,
    attributes: Object.fromEntries(attributes),
    content: content.length ? [{ type: 'text', content }] : [],
  }),
);

const closeTag: P.Parser<StreamBlock> = P.seqMap(
  //
  P.string('</'),
  tagName,
  P.string('>'),
  P.optWhitespace,
  (_, tag) => ({
    type: 'tag',
    tag,
    content: [],
    closing: true,
  }),
);

const mixedChunk: P.Parser<StreamBlock> = P.alt(selfClosingTag, openTag, closeTag, textChunk);

/**
 * Permissive streaming transformer that processes mixed content (plain text and XML fragments) from the AI service.
 */
export class StreamTransform {
  private _buffer = '';

  transform(chunk: string): StreamBlock[] {
    this._buffer += chunk;

    const results: StreamBlock[] = [];
    const parser = mixedChunk.many().skip(P.optWhitespace);
    const result = parser.parse(this._buffer);
    if (result.status) {
      for (const chunk of result.value) {
        results.push(chunk);
      }

      this._buffer = '';
    }

    return results;
  }

  // TODO(burdon): Process remaining buffer?
  flush(): StreamBlock[] {
    const remaining = this._buffer;
    this._buffer = '';
    return remaining.length > 0
      ? [
          {
            type: 'text',
            content: remaining,
          },
        ]
      : [];
  }
}
