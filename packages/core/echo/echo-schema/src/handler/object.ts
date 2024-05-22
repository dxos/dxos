//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import type { Simplify } from 'effect/Types';

import { PublicKey } from '@dxos/keys';

import { ObjectMetaSchema, type ObjectMetaType } from './meta';
import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';
import { getEchoObjectAnnotation } from '../annotations';
import { Expando } from '../expando';
import { createReactiveProxy, isValidProxyTarget, type ReactiveHandler } from '../proxy';
import { type ObjectMeta, type ReactiveObject } from '../types';
import { defineHiddenProperty } from '../utils';

export type ExcludeId<T> = Simplify<Omit<T, 'id'>>;

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(dmaretskyi): Deep mutability.
export const create: {
  <T extends {}>(obj: T): ReactiveObject<T>;
  <T extends {}>(schema: typeof Expando, obj: ExcludeId<T>, meta?: ObjectMeta): ReactiveObject<Expando>;
  <T extends {}>(schema: S.Schema<T>, obj: ExcludeId<T>, meta?: ObjectMeta): ReactiveObject<T>;
} = <T extends {}>(objOrSchema: S.Schema<T> | T, obj?: ExcludeId<T>, meta?: ObjectMeta): ReactiveObject<T> => {
  if (obj && (objOrSchema as any) !== Expando) {
    return _create<T>({ ...obj } as T, objOrSchema as S.Schema<T>);
  } else if (obj && (objOrSchema as any) === Expando) {
    return _create<T>({ ...obj } as T, undefined, meta, true);
  } else {
    // TODO(burdon): Breaks if cloned.
    return _create<T>(objOrSchema as T, undefined, meta);
  }
};

const _create = <T extends {}>(obj: T, schema?: S.Schema<T>, meta?: ObjectMeta, t = false): ReactiveObject<T> => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  if (schema) {
    if (getEchoObjectAnnotation(schema)) {
      _setId(obj);
    }
    _initMeta(obj, meta);
    prepareTypedTarget(obj, schema);
    return createReactiveProxy<T>(obj, TypedReactiveHandler.instance as ReactiveHandler<any>);
  } else {
    if (t) {
      _setId(obj);
    }
    _initMeta(obj, meta);
    return createReactiveProxy<T>(obj, UntypedReactiveHandler.instance as ReactiveHandler<any>);
  }
};

// TODO(dmaretskyi): UUID v8.
const _generateId = () => PublicKey.random().toHex();

const _setId = <T extends {}>(obj: ExcludeId<T>) => {
  if ('id' in (obj as any)) {
    throw new Error('Object already has an `id` field, which is reserved.');
  }

  (obj as any).id = _generateId();
};

const symbolMeta = Symbol.for('@dxos/meta');

const _initMeta = (obj: any, meta: ObjectMeta = { keys: [] }) => {
  prepareTypedTarget(meta, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolMeta, createReactiveProxy(meta, TypedReactiveHandler.instance as any));
};

// TODO(burdon): ReactiveObject?
export const getTargetMeta = (target: any): ObjectMetaType => {
  return target[symbolMeta];
};
