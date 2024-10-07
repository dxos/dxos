//
// Copyright 2024 DXOS.org
//

export const assertError = (value: unknown): asserts value is Error => {
  if (value instanceof Error) {
    return;
  }
  throw value;
};
