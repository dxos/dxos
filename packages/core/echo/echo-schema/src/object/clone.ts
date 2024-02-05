//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { TypedObject } from './typed-object';
import { base, type EchoObject } from './types';
import { type AutomergeObject } from '../automerge';

export type CloneOptions = {
  /**
   * @default true
   */
  retainId?: boolean;

  /**
   * Additional list of objects to clone preserving references.
   */
  additional?: (EchoObject | undefined)[];
};

/**
 * Returns new unbound clone of the object.
 */
export const clone = <T extends EchoObject>(obj: T, { retainId = true, additional = [] }: CloneOptions = {}): T => {
  if (retainId === false && additional.length > 0) {
    throw new Error('Updating ids is not supported when cloning with nested objects.');
  }

  if (!obj[base]) {
    throw new TypeError('Object is not an EchoObject.');
  }

  const clone = cloneInner(obj[base], retainId ? obj.id : PublicKey.random().toHex()) as T;

  const clones: EchoObject[] = [clone];
  for (const obj of additional) {
    if (!obj) {
      continue;
    }
    if (!obj[base]) {
      throw new TypeError('Object is not an EchoObject.');
    }

    clones.push(cloneInner(obj[base], retainId ? obj.id : PublicKey.random().toHex()));
  }

  // Update links.
  // Ensures references work before the object is bound.
  for (const clone of clones) {
    if (!(clone instanceof TypedObject)) {
      continue;
    }

    for (const ref of clones) {
      if (ref === clone) {
        continue;
      }

      (clone as AutomergeObject)[base]._linkCache!.set(ref.id, ref);
    }
  }

  return clone;
};

const cloneInner = (obj: any, id: string): EchoObject => {
  const prototype = Object.getPrototypeOf(obj);
  const automergeSnapshot = getObjectDoc(obj);

  const clone: AutomergeObject = new prototype.constructor();
  clone[base]._core.id = id;
  if (automergeSnapshot) {
    clone[base]._change((doc: any) => {
      const path = clone[base]._core.mountPath;
      if (path?.length > 0) {
        let parent = doc;
        for (const key of path.slice(0, -1)) {
          parent[key] ??= {};
          parent = parent[key];
        }
        parent[path.at(-1)!] = automergeSnapshot;
      } else {
        for (const key of Object.keys(automergeSnapshot)) {
          doc[key] = automergeSnapshot[key];
        }
      }
    });
  }

  return clone;
};

const getObjectDoc = (obj: AutomergeObject): any => {
  let value = obj._getDoc();
  for (const key of obj[base]._core.mountPath) {
    value = value?.[key];
  }
  return value;
};
