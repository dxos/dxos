//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

/**
 * Initialize a deeply nested object.
 * @returns The value of the prop after assignment.
 */
export const setDeep = <T>(obj: any, path: readonly (string | number)[], value: T): T => {
  invariant(path.length > 0);
  let parent = obj;
  for (const key of path.slice(0, -1)) {
    if (parent[key] === undefined) {
      const isArrayIndex = !isNaN(Number(key));
      parent[key] = isArrayIndex ? [] : {};
    }
    parent = parent[key];
  }

  parent[path.at(-1)!] = value;
  return obj;
};

/**
 * Gets a value from a deeply nested object.
 * @param obj
 * @param path
 * @returns The value of the prop if it exists, otherwise undefined.
 */
export const getDeep = <T>(obj: any, path: readonly (string | number)[]): T | undefined => {
  let parent = obj;
  for (const key of path) {
    parent = parent?.[key];
  }

  return parent;
};
