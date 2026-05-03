//
// Copyright 2026 DXOS.org
//

/** Adds two numbers. */
export const add = (a: number, b: number): number => a + b;

export class Counter {
  #value = 0;
  increment(): number {
    return ++this.#value;
  }
}
