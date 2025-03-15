//
// Copyright 2025 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { ECHO_ATTR_TYPE, TYPENAME_SYMBOL } from './typename';
import { type Ref } from '../ast';

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
  return {
    id,
    [ECHO_ATTR_TYPE]: typename,
    ...rest,
  };
};
