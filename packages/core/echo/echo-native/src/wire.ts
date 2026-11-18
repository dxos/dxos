//
// Copyright 2026 DXOS.org
//

// The binary encodings `crate/src/wire.rs` reads and writes; tags must match.
const TAG_NULL = 0;
const TAG_FALSE = 1;
const TAG_TRUE = 2;
const TAG_INT = 3;
const TAG_FLOAT = 4;
const TAG_STRING = 5;
const TAG_BYTES = 6;
const TAG_ARRAY = 7;
const TAG_MAP = 8;

/** Encoder storage to start from; grown by doubling. */
const INITIAL_SIZE = 64 * 1024;

/** Length marker for an absent string or list. */
export const ABSENT = 0xffffffff;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Writes call arguments into one scratch buffer reused across calls, so encoding allocates only when a
 * call needs more room than any before it.
 */
export class Encoder {
  /** Supplies storage of at least `size` bytes that keeps what was written so far, when not a JS buffer. */
  readonly #grow: ((size: number) => Uint8Array) | undefined;
  #bytes: Uint8Array;
  #view: DataView;
  #pos = 0;

  /**
   * With `grow`, the encoder writes straight into storage it supplies (the engine's input buffer in
   * wasm memory), so a call's arguments are never copied from a JS buffer into the module.
   */
  constructor(grow?: (size: number) => Uint8Array) {
    this.#grow = grow;
    this.#bytes = grow ? grow(INITIAL_SIZE) : new Uint8Array(INITIAL_SIZE);
    this.#view = new DataView(this.#bytes.buffer, this.#bytes.byteOffset, this.#bytes.byteLength);
  }

  reset(): this {
    this.#pos = 0;
    // A view of wasm memory detaches (length 0) when the memory grows during a call.
    if (this.#grow && this.#bytes.byteLength === 0) {
      this.#bytes = this.#grow(INITIAL_SIZE);
      this.#view = new DataView(this.#bytes.buffer, this.#bytes.byteOffset, this.#bytes.byteLength);
    }
    return this;
  }

  get length(): number {
    return this.#pos;
  }

  get bytes(): Uint8Array {
    return this.#bytes.subarray(0, this.#pos);
  }

  #ensure(extra: number): void {
    if (this.#pos + extra <= this.#bytes.length) {
      return;
    }
    let size = Math.max(this.#bytes.length * 2, INITIAL_SIZE);
    while (size < this.#pos + extra) {
      size *= 2;
    }
    if (this.#grow) {
      this.#bytes = this.#grow(size);
    } else {
      const next = new Uint8Array(size);
      next.set(this.#bytes.subarray(0, this.#pos));
      this.#bytes = next;
    }
    this.#view = new DataView(this.#bytes.buffer, this.#bytes.byteOffset, this.#bytes.byteLength);
  }

  u8(value: number): this {
    this.#ensure(1);
    this.#bytes[this.#pos++] = value;
    return this;
  }

  u32(value: number): this {
    this.#ensure(4);
    this.#view.setUint32(this.#pos, value, true);
    this.#pos += 4;
    return this;
  }

  f64(value: number): this {
    this.#ensure(8);
    this.#view.setFloat64(this.#pos, value, true);
    this.#pos += 8;
    return this;
  }

  str(value: string): this {
    // UTF-8 is at most three bytes per UTF-16 unit; written in place, then the length is patched.
    this.#ensure(4 + value.length * 3);
    const { written } = textEncoder.encodeInto(value, this.#bytes.subarray(this.#pos + 4));
    this.#view.setUint32(this.#pos, written, true);
    this.#pos += 4 + written;
    return this;
  }

  optStr(value: string | undefined | null): this {
    return value == null ? this.u32(ABSENT) : this.str(value);
  }

  bytesField(value: Uint8Array): this {
    this.u32(value.byteLength);
    this.#ensure(value.byteLength);
    this.#bytes.set(value, this.#pos);
    this.#pos += value.byteLength;
    return this;
  }

  strings(values: readonly string[] | undefined): this {
    if (values === undefined) {
      return this.u32(ABSENT);
    }
    this.u32(values.length);
    for (const value of values) {
      this.str(value);
    }
    return this;
  }

  /** A JS value as a tagged tree; `undefined` members of maps are left out, as Automerge stores none. */
  value(value: unknown): this {
    if (value === null || value === undefined) {
      return this.u8(TAG_NULL);
    }
    switch (typeof value) {
      case 'boolean':
        return this.u8(value ? TAG_TRUE : TAG_FALSE);
      case 'number':
        // Integers are stored as Automerge ints and the rest as floats, as automerge-js stores numbers.
        return this.u8(Number.isSafeInteger(value) ? TAG_INT : TAG_FLOAT).f64(value);
      case 'string':
        return this.u8(TAG_STRING).str(value);
      case 'object': {
        if (value instanceof Uint8Array) {
          return this.u8(TAG_BYTES).bytesField(value);
        }
        if (Array.isArray(value)) {
          const items = value.filter((item) => item !== undefined);
          this.u8(TAG_ARRAY).u32(items.length);
          for (const item of items) {
            this.value(item);
          }
          return this;
        }
        const entries = Object.entries(value).filter(([, inner]) => inner !== undefined);
        this.u8(TAG_MAP).u32(entries.length);
        for (const [key, inner] of entries) {
          this.str(key);
          this.value(inner);
        }
        return this;
      }
      default:
        return this.u8(TAG_NULL);
    }
  }
}

/**
 * Reads a call's output sequentially, straight from wasm memory (no copy), for results consumed at once.
 */
export class Decoder {
  readonly #bytes: Uint8Array;
  readonly #view: DataView;
  #pos = 0;

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u8(): number {
    return this.#bytes[this.#pos++];
  }

  u32(): number {
    const value = this.#view.getUint32(this.#pos, true);
    this.#pos += 4;
    return value;
  }

  f64(): number {
    const value = this.#view.getFloat64(this.#pos, true);
    this.#pos += 8;
    return value;
  }

  str(): string {
    const length = this.u32();
    return this.#text(length);
  }

  optStr(): string | undefined {
    const length = this.u32();
    return length === ABSENT ? undefined : this.#text(length);
  }

  /** A byte field; `copy` takes it out of wasm memory, which the next call may overwrite. */
  bytes(copy: boolean): Uint8Array {
    const length = this.u32();
    const view = this.#bytes.subarray(this.#pos, this.#pos + length);
    this.#pos += length;
    return copy ? view.slice() : view;
  }

  strings(): string[] {
    const count = this.u32();
    const values: string[] = [];
    for (let index = 0; index < count; index++) {
      values.push(this.str());
    }
    return values;
  }

  #text(length: number): string {
    const start = this.#pos;
    this.#pos += length;
    return decodeText(this.#bytes, start, length);
  }
}

/**
 * UTF-8 to string: short ASCII runs (ids, heads, type names) are assembled directly, which beats
 * `TextDecoder`'s call overhead; anything else goes through it.
 */
export const decodeText = (bytes: Uint8Array, start: number, length: number): string => {
  if (length <= 64) {
    let text = '';
    let index = start;
    for (; index < start + length; index++) {
      const byte = bytes[index];
      if (byte > 0x7f) {
        break;
      }
      text += String.fromCharCode(byte);
    }
    if (index === start + length) {
      return text;
    }
  }
  return textDecoder.decode(bytes.subarray(start, start + length));
};
