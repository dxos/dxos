//
// Copyright 2025 DXOS.org
//

import { type ObjectMeta } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { deepMapValues } from '@dxos/util';

import {
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
  ATTR_SELF_DXN,
  RelationSourceDXNId,
  RelationTargetDXNId,
  SelfDXNId,
} from '../entities';
import { Ref } from '../ref';
import { ATTR_META, ATTR_TYPE, MetaId, TypeId } from '../types';

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
    result[ATTR_TYPE] = this[TypeId].toString();
  }

  if (this[MetaId]) {
    result[ATTR_META] = serializeMeta(this[MetaId]);
  }

  if (this[SelfDXNId]) {
    result[ATTR_SELF_DXN] = this[SelfDXNId].toString();
  }

  if (this[RelationSourceDXNId]) {
    const sourceDXN = this[RelationSourceDXNId];
    invariant(sourceDXN instanceof DXN);
    result[ATTR_RELATION_SOURCE] = sourceDXN.toString();
  }
  if (this[RelationTargetDXNId]) {
    const targetDXN = this[RelationTargetDXNId];
    invariant(targetDXN instanceof DXN);
    result[ATTR_RELATION_TARGET] = targetDXN.toString();
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

    return recurse(value);
  });
};

const serializeMeta = (meta: ObjectMeta) => {
  return deepMapValues(meta, (value, recurse) => recurse(value));
};
