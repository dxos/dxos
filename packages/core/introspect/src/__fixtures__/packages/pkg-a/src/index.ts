//
// Copyright 2026 DXOS.org
//

/**
 * Adds two numbers together.
 */
export const add = (a: number, b: number): number => a + b;

/**
 * A simple counter class.
 */
export class Counter {
  #value = 0;
  increment(): number {
    return ++this.#value;
  }
}

export interface UserOptions {
  name: string;
  age?: number;
}

export type Status = 'idle' | 'loading' | 'ready';
