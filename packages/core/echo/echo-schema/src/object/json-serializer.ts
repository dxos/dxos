//
// Copyright 2025 DXOS.org
//

import { ECHO_ATTR_TYPE, TYPENAME_SYMBOL } from './typename';

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
