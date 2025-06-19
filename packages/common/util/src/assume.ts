//
// Copyright 2025 DXOS.org
//

/**
 * Assumes the type of the value.
 *
 * @param value - The value to assume the type of.
 *
 * @example
 * ```ts
 * const value: unknown = 1;
 * assumeType<number>(value);
 *
 * // value is now of type number
 * ```
 */
// NOTE: Keep as `function` to avoid type inference issues.
// eslint-disable-next-line @stayradiated/prefer-arrow-functions/prefer-arrow-functions
export function assumeType<T>(value: unknown): asserts value is T {
  // No-op.
}
