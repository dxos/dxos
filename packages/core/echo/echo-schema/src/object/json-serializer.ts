//
// Copyright 2025 DXOS.org
//

import { Reference, encodeReference } from '@dxos/echo-protocol';
import { deepMapValues } from '@dxos/util';

import { ECHO_ATTR_TYPE, TYPENAME_SYMBOL } from './typename';
import { Ref } from '../ast';

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
  const { id, ...rest } = deepMapValues(this, (value, recurse) => {
    if (Ref.isRef(value)) {
      return encodeReference(Reference.fromDXN(value.dxn));
    }
    return recurse(value);
  });
  return {
    id,
    [ECHO_ATTR_TYPE]: this[TYPENAME_SYMBOL],
    ...rest,
  };
};
