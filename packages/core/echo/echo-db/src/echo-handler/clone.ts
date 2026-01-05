//
// Copyright 2023 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { assertArgument, invariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';

import { ObjectCore } from '../core-db';

import { initEchoReactiveObjectRootProxy, isEchoObject } from './echo-handler';
import { getObjectCore } from './echo-handler';
import { symbolInternals } from './echo-proxy-target';

export type CloneOptions<T extends Obj.Any> = {
  /**
   * @default true
   */
  retainId?: boolean;

  /**
   * Additional list of objects to clone preserving references.
   */
  additional?: (T | undefined)[];
};

/**
 * Returns new unbound clone of the object.
 * @deprecated
 */
// TODO(burdon): Remove?
export const clone = <T extends Obj.Any>(obj: T, { retainId = true, additional = [] }: CloneOptions<T> = {}): T => {
  assertArgument(isEchoObject(obj), 'obj', 'expect obj to be an EchoObjectSchema');
  assertArgument(
    retainId === true || additional.length === 0,
    'retainId',
    'retainId must be true when additional is not empty',
  );

  const clone = cloneInner(obj, retainId ? obj.id : ObjectId.random());
  const clones: T[] = [clone];
  for (const innerObj of additional) {
    if (innerObj) {
      clones.push(cloneInner<T>(innerObj, retainId ? innerObj.id : ObjectId.random()));
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

      (clone as any)[symbolInternals as any].linkCache!.set(ref.id, ref);
    }
  }

  return clone;
};

const requireAutomergeCore = (obj: Obj.Any) => {
  const core = getObjectCore(obj);
  invariant(core, 'object is not an EchoObjectSchema');
  return core;
};

const cloneInner = <T extends Obj.Any>(obj: T, id: string): T => {
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
