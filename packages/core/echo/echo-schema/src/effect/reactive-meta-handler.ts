//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { createReactiveProxy } from './proxy';
import { SchemaValidator } from './schema-validator';
import { TypedReactiveHandler } from './typed-handler';
import { type ObjectMeta } from '../object';
import { defineHiddenProperty } from '../util/property';

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
  SchemaValidator.prepareTarget(metaObject, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolTargetMeta, createReactiveProxy(metaObject, TypedReactiveHandler.instance as any));
};

export const getTargetMeta = (target: any): ObjectMetaType => {
  return target[symbolTargetMeta];
};
