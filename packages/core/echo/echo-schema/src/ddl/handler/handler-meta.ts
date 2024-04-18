//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { defineHiddenProperty } from '../../util/property';
import { createReactiveProxy } from '../proxy';
import { type ObjectMeta } from '../types';

const symbolTargetMeta = Symbol.for('@dxos/meta');

const ObjectMetaSchema = S.struct({
  keys: S.mutable(
    S.array(
      S.partial(
        S.struct({
          source: S.string,
          id: S.string,
        }),
      ),
    ),
  ),
});
type ObjectMetaType = S.Schema.Type<typeof ObjectMetaSchema>;

export const initMeta = (obj: any) => {
  const metaObject: ObjectMeta = { keys: [] };
  prepareTypedTarget(metaObject, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolTargetMeta, createReactiveProxy(metaObject, TypedReactiveHandler.instance as any));
};

export const getTargetMeta = (target: any): ObjectMetaType => {
  return target[symbolTargetMeta];
};
