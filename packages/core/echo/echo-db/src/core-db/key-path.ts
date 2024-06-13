//
// Copyright 2024 DXOS.org
//

export type KeyPath = readonly (string | number)[];

export const isValidKeyPath = (value: unknown): value is KeyPath =>
  Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number');
