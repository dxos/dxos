//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type PRNG, type ULIDFactory, monotonicFactory } from 'ulidx';

// Crockford Base32 alphabet used by ULID. Excludes I, L, O, U.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

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
   * Derives a deterministic ULID-format ObjectId from arbitrary seed values.
   *
   * The same inputs always produce the same id, across processes, isolates, and workers.
   * Unlike `random()`, this method does not call `crypto.getRandomValues()` and is therefore
   * safe to call at module top-level — required for Cloudflare workerd, which forbids random
   * generation in global scope.
   *
   * Intended for stable identity of declarative artefacts (e.g. `Type.Type` entities derived
   * from a `(typename, version)` pair, fixtures, well-known objects). NOT a substitute for
   * `random()` when global uniqueness is required: callers must guarantee seed uniqueness
   * themselves; identical seeds yield identical ids and therefore collide.
   *
   * The result always passes `ObjectId.isValid(...)`.
   *
   * @param seed - One or more seed values; coerced to strings and joined.
   *
   * ```ts
   * ObjectId.deterministic('org.dxos.type.person', '0.1.0'); // stable across runs
   * ```
   */
  deterministic(...seed: (string | number)[]): ObjectId;

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

  /**
   * WARNING: To be used only within tests.
   *
   * Pins the time component of generated ObjectIds and seeds the PRNG used for the random component,
   * causing the same sequence of IDs to be generated across runs.
   * Do not use in production code as this will cause data collisions.
   *
   * @param time - Fixed timestamp (ms since epoch) used as the ULID time component.
   * @param seed - Seed value for the PRNG used for the ULID random component.
   *
   * ```ts
   * ObjectId.dangerouslySetSeed(new Date('2025-01-01').getTime(), 42);
   * ```
   *
   * NOTE: The generated IDs depend on the order of ObjectId.random() calls, which might be affected by test order, scheduling, etc.
   */
  dangerouslySetSeed(time: number, seed: number): void;
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

  static deterministic(...seed: (string | number)[]): ObjectId {
    const input = seed.map((value) => String(value)).join('\0');
    // FNV-1a 32-bit ×2 → 64 bits of derived entropy, packed into the 80-bit ULID random component.
    let h1 = 0x811c9dc5 >>> 0;
    let h2 = 0x1b873593 >>> 0;
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ ((code << 13) | (code >>> 3)), 0x01000193) >>> 0;
    }
    // 10 chars for the time component, all '0' — pins to the ULID epoch (timestamp 0) so the leading
    // char is in [0-7]. The randomness lives entirely in the 16-char random component below.
    const time = ALPHABET[0].repeat(10);
    let bits = (BigInt(h1) << 32n) | BigInt(h2);
    let rand = '';
    for (let i = 0; i < 16; i++) {
      rand = ALPHABET[Number(bits & 0x1fn)] + rand;
      bits >>= 5n;
    }
    return (time + rand) as ObjectId;
  }

  static dangerouslyDisableRandomness() {
    this.#factory = monotonicFactory(makeTestPRNG());
    this.#seedTime = new Date('2025-01-01').getTime();
  }

  static dangerouslySetSeed(time: number, seed: number) {
    this.#factory = monotonicFactory(makeTestPRNG(seed));
    this.#seedTime = time;
  }
};

/**
 * Test PRNG that always starts with the same seed and produces the same sequence.
 */
const makeTestPRNG = (seed: number = 0): PRNG => {
  const rng = new SimplePRNG(seed);
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
