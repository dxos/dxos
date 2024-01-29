//
// Copyright 2024 DXOS.org
//

export const mapValues = <T, U>(obj: Record<string, T>, fn: (value: T, key: string) => U): Record<string, U> => {
  const result: Record<string, U> = {};
  Object.keys(obj).forEach((key) => {
    result[key] = fn(obj[key], key);
  });
  return result;
};
