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
    parent[key] ??= {};
    parent = parent[key];
  }

  parent[path.at(-1)!] = value;
  // NOTE: We can't just return value here since doc's getter might return a different object.
  return parent[path.at(-1)!];
};

/**
 * Gets a value from a deeply nested object.
 * @param obj
 * @param path
 * @returns The value of the prop if it exists, otherwise undefined.
 */
export const getDeep = (obj: any, path: readonly (string | number)[]): unknown | undefined => {
  let parent = obj;
  for (const key of path) {
    parent = parent?.[key];
  }

  return parent;
};
