//
// Copyright 2023 DXOS.org
//

/**
 * Checks if the given data is an object and not null.
 *
 * Useful inside surface component resolvers as a type guard.
 *
 * @example
 * ```ts
 *  const old =
 *    data.content &&
 *      typeof data.content === 'object' &&
 *      'id' in data.content &&
 *      typeof data.content.id === 'string';
 *
 *  // becomes
 *  const new = isObject(data.content) && typeof data.content.id === 'string';
 * ```
 */
export const isObject = (data: unknown): data is { [key: string]: unknown } => !!data && typeof data === 'object';
