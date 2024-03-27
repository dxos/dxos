//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

/**
 * Initialize a deeply nested object.
 * @returns The value of the prop after assignment.
 */
export const assignDeep = <T>(doc: any, path: readonly (string | number)[], value: T): T => {
  invariant(path.length > 0);
  let parent = doc;
  for (const key of path.slice(0, -1)) {
    parent[key] ??= {};
    parent = parent[key];
  }
  parent[path.at(-1)!] = value;
  return parent[path.at(-1)!]; // NOTE: We can't just return value here since doc's getter might return a different object.
};

export const getDeep = (doc: any, path: readonly (string | number)[]): unknown | undefined => {
  let parent = doc;
  for (const key of path) {
    parent = parent?.[key];
  }
  return parent;
};
