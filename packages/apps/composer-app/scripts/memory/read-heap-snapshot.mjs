//
// Copyright 2026 DXOS.org
//

/**
 * Streaming reader for `.heapsnapshot` files.
 *
 * `JSON.parse(readFileSync(file))` fails on any snapshot past V8's ~512 MB string cap, whatever the
 * heap size, and a loaded Composer page passes it. The file is almost entirely flat integer arrays,
 * so this reads it in chunks and parses those straight into typed arrays; only the string table and
 * the small metadata sections become JS values. Returns the same shape `JSON.parse` would, with
 * `Uint32Array`s in place of the integer arrays.
 */

import { closeSync, openSync, readSync } from 'node:fs';

/** Sections that are flat arrays of non-negative integers. */
const INT_ARRAYS = new Set(['nodes', 'edges', 'trace_function_infos', 'samples', 'locations']);

const CHUNK_BYTES = 64 * 1024 * 1024;

const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const COMMA = 0x2c;
const COLON = 0x3a;
const OPEN_BRACE = 0x7b;
const CLOSE_BRACE = 0x7d;
const OPEN_BRACKET = 0x5b;
const CLOSE_BRACKET = 0x5d;

export const readHeapSnapshot = (file) => {
  const fd = openSync(file, 'r');
  let buf = Buffer.alloc(0);
  let pos = 0;

  const fill = () => {
    const next = Buffer.allocUnsafe(CHUNK_BYTES);
    const read = readSync(fd, next, 0, CHUNK_BYTES, null);
    buf = next.subarray(0, read);
    pos = 0;
    return read > 0;
  };
  const ensure = () => {
    if (pos >= buf.length && !fill()) {
      throw new Error(`${file}: unexpected end of snapshot`);
    }
  };
  const skipWhitespace = () => {
    for (;;) {
      ensure();
      const c = buf[pos];
      if (c !== 0x20 && c !== 0x0a && c !== 0x0d && c !== 0x09) {
        return c;
      }
      pos++;
    }
  };
  const expect = (char) => {
    if (skipWhitespace() !== char) {
      throw new Error(
        `${file}: expected '${String.fromCharCode(char)}' at a byte reading '${String.fromCharCode(buf[pos])}'`,
      );
    }
    pos++;
  };

  /** One JSON string token, decoded. Each is far under the cap even when the file is not. */
  const readString = () => {
    expect(QUOTE);
    const parts = [];
    let escaped = false;
    let hasEscape = false;
    for (;;) {
      ensure();
      const start = pos;
      for (; pos < buf.length; pos++) {
        const c = buf[pos];
        if (escaped) {
          escaped = false;
        } else if (c === BACKSLASH) {
          escaped = hasEscape = true;
        } else if (c === QUOTE) {
          parts.push(buf.subarray(start, pos));
          pos++;
          const raw = Buffer.concat(parts).toString('utf8');
          return hasEscape ? JSON.parse(`"${raw}"`) : raw;
        }
      }
      // Copied: the next `fill` replaces the buffer this view points into.
      parts.push(Buffer.from(buf.subarray(start, pos)));
    }
  };

  const readIntArray = () => {
    expect(OPEN_BRACKET);
    let out = new Uint32Array(1 << 20);
    let count = 0;
    let value = 0;
    let inNumber = false;
    for (;;) {
      ensure();
      for (; pos < buf.length; pos++) {
        const c = buf[pos];
        if (c >= 0x30 && c <= 0x39) {
          value = value * 10 + (c - 0x30);
          inNumber = true;
          continue;
        }
        if (inNumber) {
          if (value > 0xffffffff) {
            throw new Error(`${file}: integer ${value} does not fit a Uint32Array`);
          }
          if (count === out.length) {
            const grown = new Uint32Array(out.length * 2);
            grown.set(out);
            out = grown;
          }
          out[count++] = value;
          value = 0;
          inNumber = false;
        }
        if (c === CLOSE_BRACKET) {
          pos++;
          return out.slice(0, count);
        }
        if (c === 0x2d || c === 0x2e || c === 0x65 || c === 0x45) {
          throw new Error(`${file}: non-integer in an integer section`);
        }
      }
    }
  };

  const readStringArray = () => {
    expect(OPEN_BRACKET);
    const out = [];
    if (skipWhitespace() === CLOSE_BRACKET) {
      pos++;
      return out;
    }
    for (;;) {
      out.push(readString());
      const c = skipWhitespace();
      pos++;
      if (c === CLOSE_BRACKET) {
        return out;
      }
      if (c !== COMMA) {
        throw new Error(`${file}: malformed string table`);
      }
    }
  };

  /** Any other value, captured whole and parsed; only the small sections take this path. */
  const readRawValue = () => {
    skipWhitespace();
    const parts = [];
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (;;) {
      ensure();
      const start = pos;
      for (; pos < buf.length; pos++) {
        const c = buf[pos];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (c === BACKSLASH) {
            escaped = true;
          } else if (c === QUOTE) {
            inString = false;
          }
        } else if (depth === 0 && (c === COMMA || c === CLOSE_BRACE)) {
          // The end of a bare scalar at the top level.
          parts.push(buf.subarray(start, pos));
          return JSON.parse(Buffer.concat(parts).toString('utf8'));
        } else if (c === QUOTE) {
          inString = true;
        } else if (c === OPEN_BRACE || c === OPEN_BRACKET) {
          depth++;
        } else if (c === CLOSE_BRACE || c === CLOSE_BRACKET) {
          depth--;
          if (depth === 0) {
            pos++;
            parts.push(buf.subarray(start, pos));
            return JSON.parse(Buffer.concat(parts).toString('utf8'));
          }
        }
      }
      parts.push(Buffer.from(buf.subarray(start, pos)));
    }
  };

  try {
    const result = {};
    expect(OPEN_BRACE);
    for (;;) {
      if (skipWhitespace() === CLOSE_BRACE) {
        return result;
      }
      const key = readString();
      expect(COLON);
      result[key] = INT_ARRAYS.has(key) ? readIntArray() : key === 'strings' ? readStringArray() : readRawValue();
      if (skipWhitespace() === COMMA) {
        pos++;
      }
    }
  } finally {
    closeSync(fd);
  }
};
