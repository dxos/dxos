//
// Copyright 2025 DXOS.org
//

import type { inspect as inspectFn, InspectOptionsStylized } from 'node:util';

import { inspectCustom, type CustomInspectFunction } from '@dxos/debug';

import { ATTR_META, ATTR_TYPE, MetaId } from './model';
import { getType } from './typename';
import { type BaseEchoObject } from '../types';

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
      [ATTR_TYPE]: getType(this),
      ...props,
      [ATTR_META]: (this as any)[MetaId], // TODO(dmaretskyi): Couldn't use getMeta since that throw's if the object has no meta.
    },
    options,
  );
};
