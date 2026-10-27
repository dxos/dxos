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

/**
 * Encodes a value as SQLite JSONB with the semantics of `JSON.stringify`: `toJSON` is honoured, `undefined` and
 * functions are dropped from objects and become `null` in arrays, and non-finite numbers become `null`. Returns
 * `undefined` where `JSON.stringify` would (a bare `undefined` or function).
 */
export const encode = (value: unknown): Uint8Array | undefined => {
  // One writer serves every call, so its buffer is grown once rather than per object; a `toJSON` that encodes
  // re-enters here while the writer is busy, and gets a fresh one.
  const writer = idle ?? new Writer();
  idle = undefined;
  try {
    writer.reset();
    return writer.value(value, false) ? writer.finish() : undefined;
  } finally {
    idle = writer.capacity <= RETAINED_CAPACITY ? writer : undefined;
  }
};

/** A writer grown past this by one large object is dropped rather than kept for the next call. */
const RETAINED_CAPACITY = 1024 * 1024;

let idle: Writer | undefined;

const encoder = new TextEncoder();

/**
 * Sets `key` as an own property, as `JSON.parse` does: a plain assignment of `__proto__` would replace the
 * object's prototype with stored data instead.
 */
const setOwn = (object: Record<string, unknown>, key: string, value: unknown): void => {
  if (key === '__proto__') {
    Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
  } else {
    object[key] = value;
  }
};

/** Whether a string holds a character a `TEXT` element must not carry raw: the quote, the backslash or a C0 control. */
const needsEscape = (text: string): boolean => {
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    if (code < 0x20 || code === 0x22 || code === 0x5c) {
      return true;
    }
  }
  return false;
};

const NON_ASCII = /[\u0080-\uffff]/g;

/** A surrogate half without its partner, which UTF-8 cannot encode. */
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

/** Headers are written with this many size bytes reserved, then compacted once the payload size is known. */
const RESERVED_HEADER = 5;

class Writer {
  #bytes = new Uint8Array(64 * 1024);
  #length = 0;

  get capacity(): number {
    return this.#bytes.length;
  }

  reset(): void {
    this.#length = 0;
  }

  finish(): Uint8Array {
    return this.#bytes.slice(0, this.#length);
  }

  /** Writes `value`; returns false, writing nothing, where `JSON.stringify` would omit it. */
  value(value: unknown, inArray: boolean): boolean {
    if (value !== null && typeof value === 'object' && typeof Reflect.get(value, 'toJSON') === 'function') {
      value = Reflect.apply(Reflect.get(value, 'toJSON'), value, []);
    }
    switch (typeof value) {
      case 'string':
        this.#string(value);
        return true;
      case 'number':
        if (!Number.isFinite(value)) {
          this.#byte(ElementType.Null);
        } else {
          // JSONB types a number by its text: digits alone are an `INT`, whatever their magnitude.
          const text = JSON.stringify(value);
          this.#ascii(/[.eE]/.test(text) ? ElementType.Float : ElementType.Int, text);
        }
        return true;
      case 'boolean':
        this.#byte(value ? ElementType.True : ElementType.False);
        return true;
      case 'bigint':
        throw new TypeError('JSONB: cannot encode a bigint');
      case 'object':
        if (value === null) {
          this.#byte(ElementType.Null);
        } else if (Array.isArray(value)) {
          const header = this.#open();
          for (const element of value) {
            if (!this.value(element, true)) {
              this.#byte(ElementType.Null);
            }
          }
          this.#close(header, ElementType.Array);
        } else {
          const header = this.#open();
          for (const key of Object.keys(value)) {
            const start = this.#length;
            this.#string(key);
            if (!this.value(Reflect.get(value, key), false)) {
              this.#length = start;
            }
          }
          this.#close(header, ElementType.Object);
        }
        return true;
      default:
        if (inArray) {
          this.#byte(ElementType.Null);
          return true;
        }
        return false;
    }
  }

  #string(text: string): void {
    const length = text.length;
    this.#reserve(length * 3 + 9);
    const bytes = this.#bytes;
    // One scan writes an all-ASCII string straight into the buffer and classifies it; anything else falls back.
    let header = 0;
    if (length > 11) {
      header = this.#open();
    }
    const payload = length > 11 ? header + RESERVED_HEADER : this.#length + 1;
    let raw = false;
    for (let index = 0; index < length; index++) {
      const code = text.charCodeAt(index);
      if (code >= 0x80) {
        this.#length = length > 11 ? header : this.#length;
        this.#unicode(text);
        return;
      }
      if (code < 0x20 || code === 0x22 || code === 0x5c) {
        raw = true;
      }
      bytes[payload + index] = code;
    }
    const type = raw ? ElementType.TextRaw : ElementType.Text;
    if (length > 11) {
      this.#length = payload + length;
      this.#close(header, type);
    } else {
      bytes[this.#length] = (length << 4) | type;
      this.#length += 1 + length;
    }
  }

  /** {@link #string} for text with characters past ASCII. */
  #unicode(text: string): void {
    if (LONE_SURROGATE.test(text)) {
      // A lone surrogate has no UTF-8 form, so `TEXTJ` carries the whole string as JSON escapes: `#ascii` writes
      // one byte per code unit, which every character past ASCII would overflow.
      this.#ascii(
        ElementType.TextJ,
        JSON.stringify(text)
          .slice(1, -1)
          .replace(NON_ASCII, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`),
      );
      return;
    }
    const type = needsEscape(text) ? ElementType.TextRaw : ElementType.Text;
    const header = this.#open();
    this.#length += encoder.encodeInto(text, this.#bytes.subarray(this.#length)).written;
    this.#close(header, type);
  }

  /** An element whose payload is ASCII: a number's text, or an already-escaped string. */
  #ascii(type: number, text: string): void {
    this.#reserve(text.length + 9);
    this.#header(type, text.length);
    for (let index = 0; index < text.length; index++) {
      this.#bytes[this.#length++] = text.charCodeAt(index);
    }
  }

  #byte(type: number): void {
    this.#reserve(1);
    this.#bytes[this.#length++] = type;
  }

  /** Reserves a header ahead of a payload whose size is not yet known; returns where it starts. */
  #open(): number {
    this.#reserve(RESERVED_HEADER);
    const start = this.#length;
    this.#length += RESERVED_HEADER;
    return start;
  }

  /** Writes the smallest header for the payload written since {@link #open}, moving the payload up to meet it. */
  #close(start: number, type: number): void {
    const payload = start + RESERVED_HEADER;
    const size = this.#length - payload;
    const headerSize = size <= 11 ? 1 : size <= 0xff ? 2 : size <= 0xffff ? 3 : 5;
    if (headerSize < RESERVED_HEADER) {
      this.#bytes.copyWithin(start + headerSize, payload, this.#length);
    }
    this.#length = start;
    this.#header(type, size);
    this.#length += size;
  }

  #header(type: number, size: number): void {
    const bytes = this.#bytes;
    if (size <= 11) {
      bytes[this.#length++] = (size << 4) | type;
    } else if (size <= 0xff) {
      bytes[this.#length++] = (12 << 4) | type;
      bytes[this.#length++] = size;
    } else if (size <= 0xffff) {
      bytes[this.#length++] = (13 << 4) | type;
      bytes[this.#length++] = size >> 8;
      bytes[this.#length++] = size & 0xff;
    } else {
      bytes[this.#length++] = (14 << 4) | type;
      bytes[this.#length++] = size >>> 24;
      bytes[this.#length++] = (size >> 16) & 0xff;
      bytes[this.#length++] = (size >> 8) & 0xff;
      bytes[this.#length++] = size & 0xff;
    }
  }

  #reserve(count: number): void {
    if (this.#length + count <= this.#bytes.length) {
      return;
    }
    const grown = new Uint8Array(Math.max(this.#bytes.length * 2, this.#length + count));
    grown.set(this.#bytes.subarray(0, this.#length));
    this.#bytes = grown;
  }
}

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
            setOwn(object, key, this.value(this.end, end));
            this.#mapping = this.#mapObject;
          } else {
            setOwn(object, key, this.value(this.end, end));
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
      // `Reflect.apply` takes the bytes as an array-like, where a spread would copy them into arguments first.
      return Reflect.apply(String.fromCharCode, null, bytes.subarray(start, end));
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
