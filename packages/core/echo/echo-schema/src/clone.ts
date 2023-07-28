import invariant from "tiny-invariant";
import { EchoObject } from "./object";
import { EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';
import { base } from "./defs";
import { ProtoCodec } from "@dxos/codec-protobuf";

export type CloneOptions = {
  /**
   * @default true
   */
  retainId?: boolean;

  /**
   * Additional list of objects to clone preserving references.
   */
  additional?: (EchoObject | undefined)[];
}

/**
 * Returns new unbound clone of the object.
 */
export const clone = <T extends EchoObject>(obj: T, { }: CloneOptions = {}): T => {
  const baseObj = obj[base];
  const prototype = Object.getPrototypeOf(baseObj);
  const snapshot = getObjectSnapshot(baseObj);

  const clone: T = new prototype.constructor();
  clone[base]._id = snapshot.objectId;
  clone[base]._stateMachine?.reset(baseObj._modelConstructor.meta.snapshotCodec!.decode(snapshot.snapshot!.model.value));

  return clone;
}

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
      }
    }
  }
}