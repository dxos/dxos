//
// Copyright 2025 DXOS.org
//

import type { inspect as inspectFn, InspectOptionsStylized } from 'node:util';

import { inspectCustom, type CustomInspectFunction } from '@dxos/debug';

import { symbolMeta } from './meta';
import { ECHO_ATTR_TYPE, getType } from './typename';
import { ECHO_ATTR_META, type BaseEchoObject } from '../types';

/*
 * @internal
 */
export const attachedTypedObjectInspector = (obj: any) => {
  const descriptor = Object.getOwnPropertyDescriptor(obj, inspectCustom);
  if (descriptor) {
    return;
  }

  Object.defineProperty(obj, inspectCustom, {
    value: typedObjectInspectFunction,
    writable: false,
    enumerable: false,
    configurable: true,
  });
};

// NOTE: KEEP as function.
const typedObjectInspectFunction: CustomInspectFunction<BaseEchoObject> = function (
  this: BaseEchoObject,
  depth: number,
  options: InspectOptionsStylized,
  inspect: typeof inspectFn,
) {
  const { id, ...props } = this;
  return inspect(
    {
      id,
      [ECHO_ATTR_TYPE]: getType(this),
      ...props,
      [ECHO_ATTR_META]: (this as any)[symbolMeta], // TODO(dmaretskyi): Couldn't use getMeta since that throw's if the object has no meta.
    },
    options,
  );
};
