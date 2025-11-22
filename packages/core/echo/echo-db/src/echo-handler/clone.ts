//
// Copyright 2023 DXOS.org
//

import { type BaseObject } from '@dxos/echo/internal';
import { assertArgument, invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';

import { ObjectCore } from '../core-db';

import { type AnyLiveObject, initEchoReactiveObjectRootProxy, isEchoObject } from './echo-handler';
import { getObjectCore } from './echo-handler';
import { symbolInternals } from './echo-proxy-target';

export type CloneOptions = {
  /**
   * @default true
   */
  retainId?: boolean;

  /**
   * Additional list of objects to clone preserving references.
   */
  additional?: (AnyLiveObject<any> | undefined)[];
};

const requireAutomergeCore = (obj: AnyLiveObject<any>) => {
  const core = getObjectCore(obj);
  invariant(core, 'object is not an EchoObject');
  return core;
};

/**
 * Returns new unbound clone of the object.
 * @deprecated
 */
export const clone = <T extends BaseObject>(
  obj: AnyLiveObject<T>,
  { retainId = true, additional = [] }: CloneOptions = {},
): T => {
  assertArgument(isEchoObject(obj), 'obj', 'expect obj to be an EchoObject');
  assertArgument(
    retainId === true || additional.length === 0,
    'retainId',
    'retainId must be true when additional is not empty',
  );

  const clone = cloneInner(obj, retainId ? obj.id : ObjectId.random());
  const clones: AnyLiveObject<any>[] = [clone];
  for (const innerObj of additional) {
    if (innerObj) {
      clones.push(cloneInner(innerObj, retainId ? innerObj.id : ObjectId.random()));
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

const cloneInner = <T extends BaseObject>(obj: AnyLiveObject<T>, id: string): AnyLiveObject<T> => {
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
  let value = core.doc ?? core.docHandle!.doc();
  for (const key of core.mountPath) {
    value = (value as any)?.[key];
  }
  return value;
};
