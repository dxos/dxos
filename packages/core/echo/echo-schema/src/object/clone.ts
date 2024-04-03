//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { type EchoObject, type OpaqueEchoObject } from './types';
import { AutomergeObjectCore, getAutomergeObjectCore } from '../automerge';
import { type EchoReactiveObject, isEchoReactiveObject } from '../effect/reactive';

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

const requireAutomergeCore = (obj: OpaqueEchoObject) => {
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

  const core = requireAutomergeCore(obj);

  const clone = cloneInner(core, retainId ? obj.id : PublicKey.random().toHex()) as T;

  const clones: OpaqueEchoObject[] = [clone];
  for (const innerObj of additional) {
    if (innerObj) {
      const innerCore = requireAutomergeCore(innerObj);
      clones.push(cloneInner(innerCore, retainId ? innerCore.id : PublicKey.random().toHex()));
    }
  }

  // Update links.
  // Ensures references work before the object is bound.
  for (const clone of clones) {
    if (!isEchoReactiveObject(clone)) {
      continue;
    }

    for (const ref of clones) {
      if (ref === clone) {
        continue;
      }

      getAutomergeObjectCore(clone).linkCache!.set(ref.id, ref);
    }
  }

  return clone;
};

const cloneInner = (core: AutomergeObjectCore, id: string): OpaqueEchoObject => {
  const coreClone = new AutomergeObjectCore();
  coreClone.id = id;
  const initEchoHandler = requireEchoHandlerInitializer();
  initEchoHandler(coreClone);
  const automergeSnapshot = getObjectDoc(core);
  coreClone.change((doc: any) => {
    for (const key of Object.keys(automergeSnapshot)) {
      doc[key] = automergeSnapshot[key];
    }
  });
  return coreClone.rootProxy as any;
};

const getObjectDoc = (core: AutomergeObjectCore): any => {
  let value = core.doc ?? core.docHandle!.docSync();
  for (const key of core.mountPath) {
    value = value?.[key];
  }
  return value;
};

// Circular deps.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const requireEchoHandlerInitializer = () => require('../effect/echo-handler').initEchoReactiveObjectRootProxy;
