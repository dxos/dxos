//
// Copyright 2020 DXOS.org
//

export type OneOrMultiple<T> = T | T[];

export const dedupe = <T>(values: T[]) => Array.from(new Set(values));

export const testOneOrMultiple = <T>(expected: OneOrMultiple<T>, value: T) => {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
};
