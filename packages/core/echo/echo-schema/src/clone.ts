//
// Copyright 2023 DXOS.org
//

import { ProtoCodec } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';

import { base } from './defs';
import { EchoObject } from './object';
import { TypedObject } from './typed-object';

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
    throw new Error("Updating id's is not supported when cloning with nested objects.");
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

      (clone as TypedObject)[base]._linkCache!.set(ref.id, ref);
    }
  }

  return clone;
};

const cloneInner = (obj: EchoObject, id: string): EchoObject => {
  const prototype = Object.getPrototypeOf(obj);
  const snapshot = getObjectSnapshot(obj);

  const clone: EchoObject = new prototype.constructor();
  clone[base]._id = id;
  clone[base]._stateMachine?.reset(obj._modelConstructor.meta.snapshotCodec!.decode(snapshot.snapshot!.model.value));

  return clone;
};

const getObjectSnapshot = (obj: EchoObject): EchoObjectProto => {
  if (obj._item) {
    return obj._item.createSnapshot();
  } else {
    invariant(obj._stateMachine);
    invariant(obj._modelConstructor.meta.snapshotCodec);
    return {
      objectId: obj.id,
      genesis: {
        modelType: obj._modelConstructor.meta.type,
      },
      snapshot: {
        model: (obj._modelConstructor.meta.snapshotCodec as ProtoCodec).encodeAsAny(obj._stateMachine.snapshot()),
      },
    };
  }
};
