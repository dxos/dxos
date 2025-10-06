//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { type PRNG, type ULIDFactory, monotonicFactory } from 'ulidx';

// TODO(dmaretskyi): Make brand.
// export const ObjectIdBrand: unique symbol = Symbol('@dxos/echo/ObjectId');
// export const ObjectIdSchema = Schema.ULID.pipe(S.brand(ObjectIdBrand));
const ObjectIdSchema = Schema.String.pipe(Schema.pattern(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)).annotations({
  description: 'A Universally Unique Lexicographically Sortable Identifier',
  pattern: '^[0-7][0-9A-HJKMNP-TV-Z]{25}$',
});

export type ObjectId = typeof ObjectIdSchema.Type;

export interface ObjectIdClass extends Schema.SchemaClass<ObjectId, string> {
  /**
   * @returns true if the string is a valid ObjectId.
   */
  isValid(id: string): id is ObjectId;

  /**
   * Creates an ObjectId from a string validating the format.
   */
  make(id: string): ObjectId;

  /**
   * Generates a random ObjectId.
   */
  random(): ObjectId;

  /**
   * WARNING: To be used only within tests.
   *
   * Disables randomness in ObjectId generation, causing the same sequence of IDs to be generated.
   * Do not use in production code as this will cause data collisions.
   * Place this at the top of the test file to ensure that the same sequence of IDs is generated.
   *
   * ```ts
   * ObjectId.dangerouslyDisableRandomness();
   *
   * describe('suite', () => {
   *   // ...
   * });
   * ```
   *
   * NOTE: The generated IDs depend on the order of ObjectId.random() calls, which might be affected by test order, scheduling, etc.
   */
  dangerouslyDisableRandomness(): void;
}

/**
 * Randomly generated unique identifier for an object.
 *
 * Follows ULID spec.
 */
export const ObjectId: ObjectIdClass = class extends ObjectIdSchema {
  static #factory: ULIDFactory = monotonicFactory();
  static #seedTime: number | undefined = undefined;

  static isValid(id: string): id is ObjectId {
    try {
      Schema.decodeSync(ObjectId)(id);
      return true;
    } catch {
      return false;
    }
  }

  static random(): ObjectId {
    return this.#factory(this.#seedTime) as ObjectId;
  }

  static dangerouslyDisableRandomness() {
    this.#factory = monotonicFactory(makeTestPRNG());
    this.#seedTime = new Date('2025-01-01').getTime();
  }
};

/**
 * Test PRNG that always starts with the same seed and produces the same sequence.
 */
const makeTestPRNG = (): PRNG => {
  const rng = new SimplePRNG();
  return () => {
    return rng.next();
  };
};

/**
 * Simple Linear Congruential Generator (LCG) for pseudo-random number generation.
 * Returns numbers in the range [0, 1) (0 inclusive, 1 exclusive).
 */
export class SimplePRNG {
  #seed: number;

  // LCG parameters (from Numerical Recipes)
  static readonly #a = 1664525;
  static readonly #c = 1013904223;
  static readonly #m = Math.pow(2, 32);

  /**
   * Creates a new PRNG instance.
   * @param seed - Initial seed value. If not provided, uses 0.
   */
  constructor(seed: number = 0) {
    this.#seed = seed;
  }

  /**
   * Generates the next pseudo-random number in the range [0, 1).
   * @returns A pseudo-random number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    // Update seed using LCG formula: (a * seed + c) mod m
    this.#seed = (SimplePRNG.#a * this.#seed + SimplePRNG.#c) % SimplePRNG.#m;

    // Normalize to [0, 1) range
    return this.#seed / SimplePRNG.#m;
  }

  /**
   * Resets the generator with a new seed.
   * @param seed - New seed value.
   */
  reset(seed: number): void {
    this.#seed = seed;
  }
}
