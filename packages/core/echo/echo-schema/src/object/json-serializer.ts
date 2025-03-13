//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { ECHO_ATTR_TYPE, TYPENAME_SYMBOL } from './typename';

export const serializeStatic = <T extends { id: string }>(obj: T): T & { [ECHO_ATTR_TYPE]: string } => {
  invariant(obj[TYPENAME_SYMBOL] && typeof obj[TYPENAME_SYMBOL] === 'string');
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
