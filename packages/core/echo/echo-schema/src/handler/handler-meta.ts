//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { createReactiveProxy } from '../proxy';
import { type ObjectMeta } from '../types';
import { defineHiddenProperty } from '../utils';

const symbolTargetMeta = Symbol.for('@dxos/meta');

export const ObjectMetaSchema = S.struct({
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

export const initMeta = (obj: any, meta: ObjectMeta = { keys: [] }) => {
  prepareTypedTarget(meta, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolTargetMeta, createReactiveProxy(meta, TypedReactiveHandler.instance as any));
};

export const getTargetMeta = (target: any): ObjectMetaType => {
  return target[symbolTargetMeta];
};
