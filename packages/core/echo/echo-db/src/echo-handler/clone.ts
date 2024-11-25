//
// Copyright 2023 DXOS.org
//

import { type BaseObject, createObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { type ReactiveEchoObject, initEchoReactiveObjectRootProxy, isEchoObject } from './create';
import { getObjectCore } from './echo-handler';
import { symbolInternals } from './echo-proxy-target';
import { ObjectCore } from '../core-db';

export type CloneOptions = {
  /**
   * @default true
   */
  retainId?: boolean;

  /**
   * Additional list of objects to clone preserving references.
   */
  additional?: (ReactiveEchoObject<any> | undefined)[];
};

const requireAutomergeCore = (obj: ReactiveEchoObject<any>) => {
  const core = getObjectCore(obj);
  invariant(core, 'object is not an EchoObject');
  return core;
};

/**
 * Returns new unbound clone of the object.
 * @deprecated
 */
export const clone = <T extends BaseObject>(
  obj: ReactiveEchoObject<T>,
  { retainId = true, additional = [] }: CloneOptions = {},
): T => {
  if (retainId === false && additional.length > 0) {
    throw new Error('Updating ids is not supported when cloning with nested objects.');
  }

  const clone = cloneInner(obj, retainId ? obj.id : createObjectId());
  const clones: ReactiveEchoObject<any>[] = [clone];
  for (const innerObj of additional) {
    if (innerObj) {
      clones.push(cloneInner(innerObj, retainId ? innerObj.id : createObjectId()));
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

const cloneInner = <T extends BaseObject>(obj: ReactiveEchoObject<T>, id: string): ReactiveEchoObject<T> => {
  const core = requireAutomergeCore(obj);
  const coreClone = new ObjectCore();
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

const getObjectDoc = (core: ObjectCore): any => {
  let value = core.doc ?? core.docHandle!.docSync();
  for (const key of core.mountPath) {
    value = (value as any)?.[key];
  }
  return value;
};
