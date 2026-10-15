//
// Copyright 2026 DXOS.org
//

import { type MdlMap, MdlSyntaxError, type MdlValue } from './types.ts';

const NUMBER = /^-?\d+(?:\.\d+)?$/;

const toScalar = (raw: string): MdlValue => {
  const text = raw.trim();
  if (NUMBER.test(text)) {
    return Number(text);
  }
  if (text === 'true' || text === 'false') {
    return text === 'true';
  }
  if (text === 'null' || text === '~') {
    return null;
  }
  return text;
};

/** Removes a trailing `# comment`: a `#` at the start, or after two or more spaces, outside quotes. */
export const stripComment = (text: string): string => {
  let quote: string | undefined;
  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index);
    const previous = index === 0 ? ' ' : text.charAt(index - 1);
    if (quote !== undefined) {
      if (char === quote) {
        quote = undefined;
      }
    } else if ((char === '"' || char === "'") && /[\s{[,:]/.test(previous)) {
      quote = char;
    } else if (char === '#' && (index === 0 || /\s\s$/.test(text.slice(0, index)))) {
      return text.slice(0, index).trimEnd();
    }
  }
  return text.trimEnd();
};

/** Parses a field value: a scalar, a quoted string, or a flow-style `{ map }` or `[list]`. */
export const parseInline = (source: string, line = 0): MdlValue => {
  const text = source.trim();
  const first = text.charAt(0);
  if (first !== '{' && first !== '[' && first !== '"' && first !== "'") {
    return toScalar(text);
  }

  let pos = 0;
  const fail = (message: string): never => {
    throw new MdlSyntaxError(message, line, pos);
  };
  const peek = (): string => text.charAt(pos);
  const skip = (): void => {
    while (pos < text.length && /\s/.test(peek())) {
      pos++;
    }
  };
  const quoted = (): string => {
    const quote = peek();
    pos++;
    let out = '';
    while (pos < text.length && peek() !== quote) {
      if (peek() === '\\' && pos + 1 < text.length) {
        out += text.charAt(pos + 1);
        pos += 2;
      } else {
        out += peek();
        pos++;
      }
    }
    if (pos >= text.length) {
      fail('Unterminated string');
    }
    pos++;
    return out;
  };
  const bare = (stops: string): string => {
    const start = pos;
    while (pos < text.length && !stops.includes(peek())) {
      pos++;
    }
    return text.slice(start, pos).trim();
  };
  const value = (): MdlValue => {
    skip();
    const char = peek();
    if (char === '{') {
      return map();
    }
    if (char === '[') {
      return list();
    }
    if (char === '"' || char === "'") {
      return quoted();
    }
    const raw = bare(',]}');
    if (raw === '') {
      fail('Expected a value');
    }
    return toScalar(raw);
  };
  const map = (): MdlMap => {
    pos++;
    const out: MdlMap = {};
    skip();
    if (peek() === '}') {
      pos++;
      return out;
    }
    for (;;) {
      skip();
      const char = peek();
      const key = char === '"' || char === "'" ? quoted() : bare(':,}');
      skip();
      if (key === '' || peek() !== ':') {
        fail('Expected "key: value"');
      }
      pos++;
      out[key] = value();
      skip();
      if (peek() === ',') {
        pos++;
        continue;
      }
      if (peek() === '}') {
        pos++;
        return out;
      }
      fail('Expected "," or "}"');
    }
  };
  const list = (): MdlValue[] => {
    pos++;
    const out: MdlValue[] = [];
    skip();
    if (peek() === ']') {
      pos++;
      return out;
    }
    for (;;) {
      out.push(value());
      skip();
      if (peek() === ',') {
        pos++;
        continue;
      }
      if (peek() === ']') {
        pos++;
        return out;
      }
      fail('Expected "," or "]"');
    }
  };

  const result = value();
  skip();
  if (pos < text.length) {
    fail('Unexpected text after the value');
  }
  return result;
};
