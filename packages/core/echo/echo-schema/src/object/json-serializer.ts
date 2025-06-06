//
// Copyright 2025 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { failedInvariant, invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { ATTR_RELATION_TARGET, ATTR_RELATION_SOURCE, RelationSourceId, RelationTargetId } from './relation';
import { ECHO_ATTR_TYPE, TYPENAME_SYMBOL } from './typename';
import { type Ref } from '../ref';
import { getDXN, type BaseObject } from '../types';

type DeepReplaceRef<T> =
  T extends Ref<any> ? EncodedReference : T extends object ? { [K in keyof T]: DeepReplaceRef<T[K]> } : T;

type SerializedStatic<T extends { id: string }> = { [K in keyof T]: DeepReplaceRef<T[K]> } & {
  [ECHO_ATTR_TYPE]: string;
};

export const serializeStatic = <T extends { id: string }>(obj: T): SerializedStatic<T> => {
  const typename = (obj as any)[TYPENAME_SYMBOL];
  invariant(typename && typeof typename === 'string');
  return JSON.parse(JSON.stringify(obj));
};

/**
 * @internal
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
    configurable: false,
  });
};

// NOTE: KEEP as function.
const typedJsonSerializer = function (this: any, key: string, value: any) {
  const { id, [TYPENAME_SYMBOL]: typename, ...rest } = this;
  const result: any = {
    id,
    [ECHO_ATTR_TYPE]: typename,
  };

  if (this[RelationSourceId]) {
    result[ATTR_RELATION_SOURCE] = formatRelationConnector(this[RelationSourceId]).toString();
  }
  if (this[RelationTargetId]) {
    result[ATTR_RELATION_TARGET] = formatRelationConnector(this[RelationTargetId]).toString();
  }

  Object.assign(result, rest);
  return result;
};

const formatRelationConnector = (value: BaseObject | DXN): DXN => {
  if (value instanceof DXN) {
    return value;
  }

  if (typeof value === 'object') {
    return getDXN(value) ?? failedInvariant('Missing relation connector');
  }

  return failedInvariant('Invalid relation connector');
};
