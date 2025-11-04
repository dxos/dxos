//
// Copyright 2024 DXOS.org
//

// Based on https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore?tab=readme-ov-file#_pick.

/**
 * Creates an object composed of the object properties predicate returns truthy for.
 */

export const pick = <T extends object, K extends keyof T = keyof T>(obj: T, keys: K[]): Pick<T, K> =>
  keys.reduce(
    (result, key) => {
      if (obj && key in obj) {
        result[key] = obj[key];
      }
      return result;
    },
    {} as Pick<T, K>,
  );

/**
 * Creates an object composed of the object properties predicate returns truthy for.
 */
export const pickBy = (obj: Record<any, any>, predicate: (value: any) => boolean) => {
  const result: Record<any, any> = {};
  for (const key in obj) {
    if (predicate(obj[key])) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * Omit given props.
 * @param obj
 * @param keys
 */
export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};
