//
// Copyright 2025 DXOS.org
//

/**
 * Simplifies type (copied from effect).
 */
export type Simplify<A> = { [K in keyof A]: A[K] } extends infer B ? B : never;

/**
 * Convert specified keys to optional.
 */
// TODO(burdon): Replace with MakeOptional.
export type Optional<T, K extends keyof T> = Simplify<Omit<T, K> & Partial<Pick<T, K>>>;

/**
 * Replace types of specified keys.
 */
// TODO(burdon): Move to @dxos/util (uses effect).
export type Specialize<T, U> = Simplify<Omit<T, keyof U> & U>;
