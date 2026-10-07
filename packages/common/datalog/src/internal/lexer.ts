//
// Copyright 2026 DXOS.org
//

import type * as Ast from '../Ast.ts';

export type TokenType =
  | 'identifier'
  | 'variable'
  | 'string'
  | 'number'
  | 'operator'
  | ':-'
  | ':'
  | '('
  | ')'
  | '{'
  | '}'
  | ','
  | '.'
  | '!';

export type Token = {
  readonly type: TokenType;
  readonly text: string;
  readonly value?: Ast.Value;
  readonly position: Ast.Position;
};

export class LexError extends Error {
  constructor(
    message: string,
    readonly position: Ast.Position,
  ) {
    super(`${message} at ${position.line}:${position.column}`);
  }
}

const PUNCTUATION: Record<string, TokenType | undefined> = {
  ':': ':',
  '(': '(',
  ')': ')',
  '{': '{',
  '}': '}',
  ',': ',',
  '.': '.',
  '!': '!',
};

const ESCAPES: Record<string, string> = { 'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', '"': '"', "'": "'" };

/** Splits dialect source into tokens with 1-based positions. */
export const tokenize = (source: string): Token[] => {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let lineStart = 0;
  const here = (): Ast.Position => ({ line, column: offset - lineStart + 1 });
  const advance = (count: number) => {
    for (let index = 0; index < count; index++) {
      if (source[offset] === '\n') {
        line++;
        lineStart = offset + 1;
      }
      offset++;
    }
  };

  while (offset < source.length) {
    const char = source[offset];
    const rest = source.slice(offset);
    if (/\s/.test(char)) {
      advance(1);
      continue;
    }
    if (char === '%' || rest.startsWith('//')) {
      while (offset < source.length && source[offset] !== '\n') {
        advance(1);
      }
      continue;
    }
    if (rest.startsWith('/*')) {
      const start = here();
      const end = source.indexOf('*/', offset + 2);
      if (end < 0) {
        throw new LexError('Unterminated comment', start);
      }
      advance(end + 2 - offset);
      continue;
    }

    const position = here();
    if (char === '"' || char === "'") {
      let value = '';
      let cursor = offset + 1;
      while (cursor < source.length && source[cursor] !== char) {
        if (source[cursor] === '\n') {
          throw new LexError('Unterminated string', position);
        }
        if (source[cursor] === '\\') {
          const escaped = source[cursor + 1];
          value += ESCAPES[escaped] ?? escaped ?? '';
          cursor += 2;
        } else {
          value += source[cursor++];
        }
      }
      if (cursor >= source.length) {
        throw new LexError('Unterminated string', position);
      }
      tokens.push({ type: 'string', text: source.slice(offset, cursor + 1), value, position });
      advance(cursor + 1 - offset);
      continue;
    }

    // A digit run glued to letters (`2d`, `30d`) is a symbol, which keeps durations unquoted.
    const numeric = /^-?\d+(\.\d+)?(?![A-Za-z_\d])/.exec(rest);
    if (numeric) {
      tokens.push({ type: 'number', text: numeric[0], value: Number(numeric[0]), position });
      advance(numeric[0].length);
      continue;
    }
    const word = /^[A-Za-z0-9_][A-Za-z0-9_]*/.exec(rest);
    if (word) {
      const text = word[0];
      const type: TokenType = /^[A-Z_]/.test(text) ? 'variable' : 'identifier';
      tokens.push({ type, text, value: type === 'identifier' ? text : undefined, position });
      advance(text.length);
      continue;
    }
    const operator = /^(<=|>=|!=|=|<|>)/.exec(rest);
    if (operator) {
      tokens.push({ type: 'operator', text: operator[0], position });
      advance(operator[0].length);
      continue;
    }
    if (rest.startsWith(':-')) {
      tokens.push({ type: ':-', text: ':-', position });
      advance(2);
      continue;
    }
    const punctuation = PUNCTUATION[char];
    if (punctuation) {
      tokens.push({ type: punctuation, text: char, position });
      advance(1);
      continue;
    }
    throw new LexError(`Unexpected character '${char}'`, position);
  }
  return tokens;
};
