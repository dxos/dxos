//
// Copyright 2026 DXOS.org
//

// Automerge's value classes and value checks without loading Automerge. Automerge recognizes each
// value by a registered symbol rather than by its class, so a value made with either class is the same
// value on both sides, and `instanceof` below matches both classes' instances.

const IMMUTABLE_STRING = Symbol.for('_am_immutableString');
const COUNTER = Symbol.for('_am_counter');
const INT = Symbol.for('_am_int');
const UINT = Symbol.for('_am_uint');
const F64 = Symbol.for('_am_f64');

const marked = (value: unknown, symbol: symbol): boolean =>
  typeof value === 'object' && value !== null && Object.hasOwn(value, symbol);

/** A string Automerge stores as one scalar rather than as text. */
export class TabImmutableString {
  static [Symbol.hasInstance](value: unknown): boolean {
    return marked(value, IMMUTABLE_STRING);
  }

  readonly val: string;

  constructor(val: string) {
    this.val = val;
    Reflect.set(this, IMMUTABLE_STRING, true);
  }

  toString(): string {
    return this.val;
  }

  toJSON(): string {
    return this.val;
  }
}

/** A counter as a value to write; incrementing needs Automerge, which a tab does not run. */
export class TabCounter {
  static [Symbol.hasInstance](value: unknown): boolean {
    return marked(value, COUNTER);
  }

  readonly value: number;

  constructor(value?: number) {
    this.value = value || 0;
    Reflect.defineProperty(this, COUNTER, { value: true });
  }

  valueOf(): number {
    return this.value;
  }

  toString(): string {
    return this.valueOf().toString();
  }

  toJSON(): number {
    return this.value;
  }

  increment(_delta?: number): number {
    throw new Error('Counters should not be incremented outside of a change callback');
  }

  decrement(_delta?: number): number {
    throw new Error('Counters should not be decremented outside of a change callback');
  }
}

export class TabInt {
  static [Symbol.hasInstance](value: unknown): boolean {
    return marked(value, INT);
  }

  readonly value: number;

  constructor(value: number) {
    if (!(Number.isInteger(value) && value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER)) {
      throw new RangeError(`Value ${value} cannot be a uint`);
    }
    this.value = value;
    Reflect.defineProperty(this, INT, { value: true });
    Object.freeze(this);
  }
}

export class TabUint {
  static [Symbol.hasInstance](value: unknown): boolean {
    return marked(value, UINT);
  }

  readonly value: number;

  constructor(value: number) {
    if (!(Number.isInteger(value) && value <= Number.MAX_SAFE_INTEGER && value >= 0)) {
      throw new RangeError(`Value ${value} cannot be a uint`);
    }
    this.value = value;
    Reflect.defineProperty(this, UINT, { value: true });
    Object.freeze(this);
  }
}

export class TabFloat64 {
  static [Symbol.hasInstance](value: unknown): boolean {
    return marked(value, F64);
  }

  readonly value: number;

  constructor(value: number) {
    if (typeof value !== 'number') {
      throw new RangeError(`Value ${value} cannot be a float64`);
    }
    this.value = value || 0.0;
    Reflect.defineProperty(this, F64, { value: true });
    Object.freeze(this);
  }
}

export const isImmutableString = (value: unknown): value is TabImmutableString => marked(value, IMMUTABLE_STRING);

export const isCounter = (value: unknown): value is TabCounter => marked(value, COUNTER);

/** The datatype an explicitly typed number is written with, or undefined for any other value. */
export const numberType = (value: unknown): { value: number; datatype: 'int' | 'uint' | 'float64' } | undefined => {
  if (value instanceof TabInt) {
    return { value: value.value, datatype: 'int' };
  }
  if (value instanceof TabUint) {
    return { value: value.value, datatype: 'uint' };
  }
  if (value instanceof TabFloat64) {
    return { value: value.value, datatype: 'float64' };
  }
  return undefined;
};

/** Automerge's `equals`: plain deep equality over objects' own keys. */
export const equals = (left: unknown, right: unknown): boolean => {
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return left === right;
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every(
    (key, index) => key === rightKeys[index] && equals(Reflect.get(left, key), Reflect.get(right, key)),
  );
};
