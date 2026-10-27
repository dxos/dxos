//
// Copyright 2026 DXOS.org
//

/**
 * Reader for SQLite's JSONB, the binary JSON a `jsonb()` call returns (SQLite ≥ 3.45).
 *
 * Each element is a header followed by its payload. The header's low nibble is the type and its high nibble
 * the payload size: 0–11 is the size itself, 12–15 say it follows in the next 1, 2, 4 or 8 bytes, big-endian.
 * Containers carry their byte size, so a sibling is skipped without reading it.
 * See https://sqlite.org/jsonb.html.
 */

const ElementType = {
  Null: 0,
  True: 1,
  False: 2,
  Int: 3,
  Int5: 4,
  Float: 5,
  Float5: 6,
  Text: 7,
  TextJ: 8,
  Text5: 9,
  TextRaw: 10,
  Array: 11,
  Object: 12,
} as const;

/** Called on every object as it is completed, innermost first; its return value takes the object's place. */
export type MapObject = (object: Record<string, unknown>) => unknown;

export type DecodeOptions = {
  mapObject?: MapObject;
  /** Keys of a top-level object whose values are decoded without {@link mapObject}. */
  skipMapping?: ReadonlySet<string>;
};

/**
 * Up to this length an ASCII string is built from its bytes, which beats a `TextDecoder` call, and an ASCII
 * key is looked up in {@link interned}: keys repeat across every object, and handing V8 the same string each
 * time spares the decode and the hashing of a fresh string at every property store.
 */
const SHORT_STRING = 32;

/** Bounds {@link interned}, so a stream of objects with unique keys cannot grow it without limit. */
const INTERNED_LIMIT = 4096;

const interned = new Map<number, string>();

const decoder = new TextDecoder('utf-8', { ignoreBOM: true });

/**
 * Decodes a JSONB value into the same value `JSON.parse` returns for its text, with `mapObject` applied
 * to every object in the same pass.
 */
export const decode = (bytes: Uint8Array, options: DecodeOptions = {}): unknown => {
  const reader = new Reader(bytes, options.mapObject, options.skipMapping);
  const value = reader.value(0, bytes.length);
  if (reader.end !== bytes.length) {
    throw new SyntaxError(`JSONB: ${bytes.length - reader.end} trailing bytes`);
  }
  return value;
};

/**
 * Decodes the value of one key of a top-level object, skipping every other entry without reading it;
 * `undefined` when the value is not an object or the key is absent.
 */
export const readTopLevel = (bytes: Uint8Array, key: string): unknown => {
  const reader = new Reader(bytes, undefined, undefined);
  const position = reader.find(key);
  return position === undefined ? undefined : reader.value(position, bytes.length);
};

/** {@link readTopLevel} for a string value, without allocating anything for a value of another type. */
export const readTopLevelString = (bytes: Uint8Array, key: string): string | undefined => {
  const reader = new Reader(bytes, undefined, undefined);
  const position = reader.find(key);
  if (position === undefined) {
    return undefined;
  }
  reader.header(position, bytes.length);
  return isString(reader.type) ? reader.string(reader.type, reader.start, reader.end) : undefined;
};

/** Whether the bytes start with a JSONB object header, which a JSON text column value never does. */
export const isObject = (bytes: Uint8Array): boolean => bytes.length > 0 && (bytes[0] & 0x0f) === ElementType.Object;

const isString = (type: number): boolean => type >= ElementType.Text && type <= ElementType.TextRaw;

/**
 * A cursor over one buffer. `header` leaves the element it read in `type`, `start` and `end` rather than
 * returning a record, so a decode allocates nothing beyond the values it produces.
 */
class Reader {
  type = 0;
  start = 0;
  end = 0;

  readonly #bytes: Uint8Array;
  readonly #mapObject: MapObject | undefined;
  readonly #skipMapping: ReadonlySet<string> | undefined;
  #mapping: MapObject | undefined;
  #depth = 0;

  constructor(bytes: Uint8Array, mapObject: MapObject | undefined, skipMapping: ReadonlySet<string> | undefined) {
    this.#bytes = bytes;
    this.#mapObject = mapObject;
    this.#skipMapping = skipMapping;
    this.#mapping = mapObject;
  }

  /** The position of the value under `key` in the top-level object, without reading any other entry's value. */
  find(key: string): number | undefined {
    const limit = this.#bytes.length;
    this.header(0, limit);
    if (this.type !== ElementType.Object) {
      return undefined;
    }
    const end = this.end;
    let position = this.start;
    while (position < end) {
      this.header(position, end);
      const matches = isString(this.type) && this.string(this.type, this.start, this.end) === key;
      const valuePosition = this.end;
      if (matches) {
        return valuePosition;
      }
      this.header(valuePosition, end);
      position = this.end;
    }
    return undefined;
  }

  /** Reads the header at `position`, checking the element ends within `limit`. */
  header(position: number, limit: number): void {
    const bytes = this.#bytes;
    if (position >= limit) {
      throw new SyntaxError(`JSONB: header past end at ${position}`);
    }
    const first = bytes[position];
    const sizeCode = first >> 4;
    let size: number;
    let start: number;
    if (sizeCode <= 11) {
      size = sizeCode;
      start = position + 1;
    } else if (sizeCode === 12) {
      size = bytes[position + 1];
      start = position + 2;
    } else if (sizeCode === 13) {
      size = (bytes[position + 1] << 8) | bytes[position + 2];
      start = position + 3;
    } else if (sizeCode === 14) {
      size = readUint32(bytes, position + 1);
      start = position + 5;
    } else {
      if (readUint32(bytes, position + 1) !== 0) {
        throw new SyntaxError('JSONB: element larger than 4 GiB');
      }
      size = readUint32(bytes, position + 5);
      start = position + 9;
    }
    const end = start + size;
    if (end > limit) {
      throw new SyntaxError(`JSONB: element at ${position} overruns its container`);
    }
    this.type = first & 0x0f;
    this.start = start;
    this.end = end;
  }

  /** Decodes the element at `position`; afterwards `end` is the position just past it. */
  value(position: number, limit: number): unknown {
    this.header(position, limit);
    const { type, start, end } = this;
    switch (type) {
      case ElementType.Null:
        return null;
      case ElementType.True:
        return true;
      case ElementType.False:
        return false;
      case ElementType.Int:
        return this.integer(start, end);
      case ElementType.Float:
        return Number(this.ascii(start, end));
      case ElementType.Int5:
        return parseInt5(this.ascii(start, end));
      case ElementType.Float5:
        return parseFloat5(this.ascii(start, end));
      case ElementType.Text:
      case ElementType.TextJ:
      case ElementType.Text5:
      case ElementType.TextRaw:
        return this.string(type, start, end);
      case ElementType.Array: {
        const array: unknown[] = [];
        this.#depth++;
        let cursor = start;
        while (cursor < end) {
          array.push(this.value(cursor, end));
          cursor = this.end;
        }
        this.#depth--;
        this.end = end;
        return array;
      }
      case ElementType.Object: {
        const object: Record<string, unknown> = {};
        const topLevel = this.#depth === 0;
        this.#depth++;
        let cursor = start;
        while (cursor < end) {
          this.header(cursor, end);
          if (!isString(this.type)) {
            throw new SyntaxError(`JSONB: object key at ${cursor} is not a string`);
          }
          const key = this.key(this.type, this.start, this.end);
          if (topLevel && this.#skipMapping?.has(key)) {
            this.#mapping = undefined;
            object[key] = this.value(this.end, end);
            this.#mapping = this.#mapObject;
          } else {
            object[key] = this.value(this.end, end);
          }
          cursor = this.end;
        }
        this.#depth--;
        this.end = end;
        return this.#mapping ? this.#mapping(object) : object;
      }
      default:
        throw new SyntaxError(`JSONB: reserved element type ${type} at ${position}`);
    }
  }

  /** {@link string} for an object key, interned when short and plain. */
  key(type: number, start: number, end: number): string {
    if (type !== ElementType.Text || end - start > SHORT_STRING) {
      return this.string(type, start, end);
    }
    const bytes = this.#bytes;
    // FNV-1a over the bytes, seeded with the length so a key and its prefix rarely share a slot.
    let hash = 0x811c9dc5 ^ (end - start);
    for (let index = start; index < end; index++) {
      const byte = bytes[index];
      if (byte >= 0x80) {
        return this.string(type, start, end);
      }
      hash = Math.imul(hash ^ byte, 0x01000193);
    }
    const cached = interned.get(hash);
    if (cached !== undefined && cached.length === end - start && sameAscii(cached, bytes, start)) {
      return cached;
    }
    const text = this.utf8(start, end);
    if (interned.size >= INTERNED_LIMIT) {
      interned.clear();
    }
    interned.set(hash, text);
    return text;
  }

  string(type: number, start: number, end: number): string {
    const text = this.utf8(start, end);
    switch (type) {
      case ElementType.TextJ:
        return text.includes('\\') ? JSON.parse(`"${text}"`) : text;
      case ElementType.Text5:
        return unescapeJson5(text);
      default:
        return text;
    }
  }

  /** A decimal integer read off its digits; anything a double cannot hold exactly goes through `Number`. */
  integer(start: number, end: number): number {
    const bytes = this.#bytes;
    const negative = bytes[start] === 0x2d;
    const first = negative ? start + 1 : start;
    if (end - first > 15) {
      return Number(this.ascii(start, end));
    }
    let value = 0;
    for (let index = first; index < end; index++) {
      value = value * 10 + (bytes[index] - 0x30);
    }
    return negative ? -value : value;
  }

  ascii(start: number, end: number): string {
    let text = '';
    for (let index = start; index < end; index++) {
      text += String.fromCharCode(this.#bytes[index]);
    }
    return text;
  }

  utf8(start: number, end: number): string {
    const bytes = this.#bytes;
    if (end - start <= SHORT_STRING) {
      for (let index = start; index < end; index++) {
        if (bytes[index] >= 0x80) {
          return decoder.decode(bytes.subarray(start, end));
        }
      }
      return String.fromCharCode.apply(null, bytes.subarray(start, end));
    }
    return decoder.decode(bytes.subarray(start, end));
  }
}

const sameAscii = (text: string, bytes: Uint8Array, start: number): boolean => {
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) !== bytes[start + index]) {
      return false;
    }
  }
  return true;
};

const readUint32 = (bytes: Uint8Array, position: number): number =>
  bytes[position] * 0x1000000 + ((bytes[position + 1] << 16) | (bytes[position + 2] << 8) | bytes[position + 3]);

const parseInt5 = (text: string): number => {
  const negative = text.startsWith('-');
  const unsigned = negative || text.startsWith('+') ? text.slice(1) : text;
  const value = /^0x/i.test(unsigned) ? parseInt(unsigned.slice(2), 16) : Number(unsigned);
  return negative ? -value : value;
};

const parseFloat5 = (text: string): number => {
  const unsigned = text.replace(/^[+-]/, '');
  const negative = text.startsWith('-');
  const value = unsigned === 'Infinity' ? Infinity : unsigned === 'NaN' ? NaN : Number(unsigned);
  return negative ? -value : value;
};

const JSON5_ESCAPES: Record<string, string> = {
  '"': '"',
  "'": "'",
  '\\': '\\',
  '/': '/',
  'b': '\b',
  'f': '\f',
  'n': '\n',
  'r': '\r',
  't': '\t',
  'v': '\v',
  '0': '\0',
};

/** Unescapes a JSON5 string body: the JSON escapes plus `\'`, `\v`, `\0`, `\xHH` and escaped line breaks. */
const unescapeJson5 = (text: string): string =>
  text.replace(
    /\\(?:u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|(\r\n|[\n\r\u2028\u2029])|(.))/g,
    (_, unicode, hex, lineBreak, char) => {
      if (unicode !== undefined) {
        return String.fromCharCode(parseInt(unicode, 16));
      }
      if (hex !== undefined) {
        return String.fromCharCode(parseInt(hex, 16));
      }
      if (lineBreak !== undefined) {
        return '';
      }
      return JSON5_ESCAPES[char] ?? char;
    },
  );
