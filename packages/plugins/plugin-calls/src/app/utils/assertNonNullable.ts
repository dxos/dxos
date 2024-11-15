//
// Copyright 2024 DXOS.org
//

export const assertNonNullable = <T>(value: T): asserts value is NonNullable<T> => {
  if (value === null) {
    throw new Error('Value was null');
  }
  if (value === undefined) {
    throw new Error('Value was undefined');
  }
};
