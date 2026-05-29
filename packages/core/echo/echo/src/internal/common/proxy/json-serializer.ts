//
// Copyright 2025 DXOS.org
//

import { type EntityMeta } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { EID } from '@dxos/keys';
import { deepMapValues, encodeUint8ArrayToJson } from '@dxos/util';

import { Ref } from '../../Ref';
import {
  ATTR_META,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_URI,
  ATTR_TYPE,
  MetaId,
  RelationSourceDXNId,
  RelationTargetDXNId,
  SelfURIId,
  TypeId,
} from '../types';

/**
 * Attaches a toJSON method to the object for typed serialization.
 */
export const attachTypedJsonSerializer = (obj: any) => {
  const descriptor = Object.getOwnPropertyDescriptor(obj, 'toJSON');
  if (descriptor) {
    return;
  }

  Object.defineProperty(obj, 'toJSON', {
    value: typedJsonSerializer,
    writable: false,
    enumerable: false,
    // Setting `configurable` to false breaks proxy invariants, should be fixable.
    configurable: true,
  });
};

// NOTE: KEEP as function.
// Exported for use in objectToJSON.
export const typedJsonSerializer = function (this: any) {
  const { id, ...rest } = this;
  const result: any = {
    id,
  };

  if (this[TypeId]) {
    result[ATTR_TYPE] = this[TypeId];
  }

  if (this[MetaId]) {
    result[ATTR_META] = serializeMeta(this[MetaId]);
  }

  if (this[SelfURIId]) {
    result[ATTR_SELF_URI] = this[SelfURIId];
  }

  if (this[RelationSourceDXNId]) {
    const sourceDXN = this[RelationSourceDXNId];
    invariant(EID.isEID(sourceDXN));
    result[ATTR_RELATION_SOURCE] = sourceDXN;
  }
  if (this[RelationTargetDXNId]) {
    const targetDXN = this[RelationTargetDXNId];
    invariant(EID.isEID(targetDXN));
    result[ATTR_RELATION_TARGET] = targetDXN;
  }

  Object.assign(result, serializeData(rest));
  return result;
};

const serializeData = (data: unknown) => {
  return deepMapValues(data, (value, recurse) => {
    if (Ref.isRef(value)) {
      // TODO(dmaretskyi): Should this be configurable?
      return value.noInline().encode();
    }
    if (value instanceof Uint8Array) {
      return encodeUint8ArrayToJson(value);
    }

    return recurse(value);
  });
};

const serializeMeta = (meta: EntityMeta) => {
  return deepMapValues(meta, (value, recurse) => recurse(value));
};
