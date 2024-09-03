//
// Copyright 2024 DXOS.org
//

import { randomBytes } from '@dxos/crypto';

// TODO(burdon): Factor out from dxos/protocols to new common package.
export class ApiError extends Error {}
export class ReadonlyException extends ApiError {}
export class RangeException extends ApiError {
  constructor(n: number) {
    super();
  }
}

/**
 * With a string length of 8, the chance of a collision is 0.02% for a sheet with 10,000 strings.
 */
export const createIndex = (length = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  const randomBuffer = randomBytes(length);
  return Array.from(randomBuffer, (byte) => characters[byte % charactersLength]).join('');
};

export const createIndices = (length: number): string[] => Array.from({ length }).map(() => createIndex());

// TODO(burdon): Factor out.
export const pickOne = <T>(values: T[]): T => values[Math.floor(Math.random() * values.length)];
export const pickSome = <T>(values: T[], n = 1): T[] => {
  const result = new Set<T>();
  while (result.size < n) {
    result.add(pickOne(values));
  }
  return Array.from(result.values());
};
