//
// Copyright 2024 DXOS.org
//

// Based on https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore?tab=readme-ov-file#_pick.

/**
 * Creates an object composed of the object properties predicate returns truthy for.
 */
export const pick = <T extends object, U extends keyof T>(object: T, keys: U[]): Pick<T, U> =>
  keys.reduce(
    (obj, key) => {
      if (object && key in object) {
        obj[key] = object[key];
      }
      return obj;
    },
    {} as Pick<T, U>,
  );

/**
 * Creates an object composed of the object properties predicate returns truthy for.
 */
export const pickBy = (object: Record<any, any>, predicate: (value: any) => boolean) => {
  const obj: Record<any, any> = {};
  for (const key in object) {
    if (predicate(object[key])) {
      obj[key] = object[key];
    }
  }
  return obj;
};
