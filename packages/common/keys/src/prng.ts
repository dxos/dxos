//
// Copyright 2025 DXOS.org
//

/**
 * Simple Linear Congruential Generator (LCG) for pseudo-random number generation.
 * Returns numbers in the range [0, 1) (0 inclusive, 1 exclusive).
 */
export class SimplePRNG {
  private _seed: number;

  // LCG parameters (from Numerical Recipes)
  private static readonly _a = 1664525;
  private static readonly _c = 1013904223;
  private static readonly _m = Math.pow(2, 32);

  /**
   * Creates a new PRNG instance.
   * @param seed - Initial seed value. If not provided, uses current timestamp.
   */
  constructor(seed?: number) {
    this._seed = seed ?? Date.now();
  }

  /**
   * Generates the next pseudo-random number in the range [0, 1).
   * @returns A pseudo-random number between 0 (inclusive) and 1 (exclusive).
   */
  next(): number {
    // Update seed using LCG formula: (a * seed + c) mod m
    this._seed = (SimplePRNG._a * this._seed + SimplePRNG._c) % SimplePRNG._m;

    // Normalize to [0, 1) range
    return this._seed / SimplePRNG._m;
  }

  /**
   * Resets the generator with a new seed.
   * @param seed - New seed value.
   */
  reset(seed: number): void {
    this._seed = seed;
  }
}

/**
 * Creates a simple PRNG function with optional seed.
 * @param seed - Optional seed value.
 * @returns A function that returns pseudo-random numbers in [0, 1).
 */
export const createPRNG = (seed?: number): (() => number) => {
  const prng = new SimplePRNG(seed);
  return () => prng.next();
};
