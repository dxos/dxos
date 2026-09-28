//
// Copyright 2026 DXOS.org
//

import { type Patch } from '../internal/model.ts';
import * as Op from '../Op.ts';

/** `root` with `patches` applied, as a listener that keeps its own copy of a document applies them. */
export const applyPatches = (root: unknown, patches: readonly (Op.Patch | Patch)[]): unknown => {
  let current = structuredClone(root);
  for (const patch of patches) {
    if (patch.action === 'conflict') {
      continue;
    }
    const parentPath = patch.path.slice(0, -1);
    const last = patch.path[patch.path.length - 1];
    const parent = Op.getAt(current, parentPath);
    if (typeof parent === 'string') {
      const index = Number(last);
      const text =
        patch.action === 'splice'
          ? parent.slice(0, index) + patch.value + parent.slice(index)
          : parent.slice(0, index) + parent.slice(index + (patch.action === 'del' ? (patch.length ?? 1) : 0));
      current = parentPath.length === 0 ? text : setAt(current, parentPath, text);
      continue;
    }
    switch (patch.action) {
      case 'put':
        current = patch.path.length === 0 ? patch.value : setAt(current, patch.path, patch.value);
        break;
      case 'del':
        if (Array.isArray(parent)) {
          parent.splice(Number(last), patch.length ?? 1);
        } else if (Op.isContainer(parent)) {
          Reflect.deleteProperty(parent, last);
        }
        break;
      case 'insert':
        if (Array.isArray(parent)) {
          parent.splice(Number(last), 0, ...patch.values);
        }
        break;
      case 'splice':
        throw new Error('A splice outside a string');
    }
  }
  return current;
};

const setAt = (root: unknown, path: readonly (string | number)[], value: unknown): unknown => {
  const parent = Op.getAt(root, path.slice(0, -1));
  if (Op.isContainer(parent)) {
    Reflect.set(parent, path[path.length - 1], value);
  }
  return root;
};
