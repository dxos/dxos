//
// Copyright 2023 DXOS.org
//

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { initEchoReactiveObjectRootProxy, isEchoObject } from './create';
import { symbolInternals } from './echo-proxy-target';
import { AutomergeObjectCore, getAutomergeObjectCore } from '../automerge';

export type CloneOptions = {
  /**
   * @default true
   */
  retainId?: boolean;

  /**
   * Additional list of objects to clone preserving references.
   */
  additional?: (EchoReactiveObject<any> | undefined)[];
};

const requireAutomergeCore = (obj: EchoReactiveObject<any>) => {
  const core = getAutomergeObjectCore(obj);
  invariant(core, 'object is not an EchoObject');
  return core;
};

/**
 * Returns new unbound clone of the object.
 * @deprecated
 */
export const clone = <T extends {}>(
  obj: EchoReactiveObject<T>,
  { retainId = true, additional = [] }: CloneOptions = {},
): T => {
  if (retainId === false && additional.length > 0) {
    throw new Error('Updating ids is not supported when cloning with nested objects.');
  }

  const clone = cloneInner(obj, retainId ? obj.id : PublicKey.random().toHex());

  const clones: EchoReactiveObject<any>[] = [clone];
  for (const innerObj of additional) {
    if (innerObj) {
      clones.push(cloneInner(innerObj, retainId ? innerObj.id : PublicKey.random().toHex()));
    }
  }

  // Update links.
  // Ensures references work before the object is bound.
  for (const clone of clones) {
    if (!isEchoObject(clone)) {
      continue;
    }

    for (const ref of clones) {
      if (ref === clone) {
        continue;
      }

      clone[symbolInternals as any].linkCache!.set(ref.id, ref);
    }
  }

  return clone;
};

const cloneInner = <T>(obj: EchoReactiveObject<T>, id: string): EchoReactiveObject<T> => {
  const core = requireAutomergeCore(obj);
  const coreClone = new AutomergeObjectCore();
  coreClone.initNewObject();
  coreClone.id = id;
  const proxy = initEchoReactiveObjectRootProxy(coreClone);
  const automergeSnapshot = getObjectDoc(core);
  coreClone.change((doc: any) => {
    for (const key of Object.keys(automergeSnapshot)) {
      doc[key] = automergeSnapshot[key];
    }
  });
  return proxy as any;
};

const getObjectDoc = (core: AutomergeObjectCore): any => {
  let value = core.doc ?? core.docHandle!.docSync();
  for (const key of core.mountPath) {
    value = value?.[key];
  }
  return value;
};
