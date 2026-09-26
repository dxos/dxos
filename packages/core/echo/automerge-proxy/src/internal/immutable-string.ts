//
// Copyright 2026 DXOS.org
//

// Automerge's `ImmutableString` without loading Automerge, whose entry points touch WebAssembly as they
// load. Automerge recognizes one by a registered symbol rather than by its class, so a value made with
// either class reads as a scalar string on both sides.

const IMMUTABLE_STRING = Symbol.for('_am_immutableString');

/** The tab's scalar string: Automerge's `ImmutableString`, marked the same way. */
export class TabImmutableString {
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

let make = (value: string): object => new TabImmutableString(value);

/** A scalar string as the model hands it out. */
export const immutableString = (value: string): object => make(value);

/**
 * Makes the model hand out another class's scalar strings. Tests run the worker's Automerge in the
 * same module registry as the tabs, and ECHO code checks `instanceof A.RawString`, so the model makes
 * Automerge's class there.
 */
export const useImmutableString = (factory: (value: string) => object): void => {
  make = factory;
};

export const isImmutableString = (value: unknown): value is TabImmutableString =>
  typeof value === 'object' && value !== null && Object.hasOwn(value, IMMUTABLE_STRING);
