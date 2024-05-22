//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { type ExcludeId, ObjectMetaSchema, type ObjectMetaType } from './types';
import { UntypedReactiveHandler } from './untyped-handler';
import { getEchoObjectAnnotation } from '../annotations';
import { Expando } from '../expando';
import { createReactiveProxy, isValidProxyTarget, type ReactiveHandler } from '../proxy';
import { type ObjectMeta, type ReactiveObject } from '../types';
import { defineHiddenProperty } from '../utils';

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
    return _create<T>({ ...obj } as T, meta, objOrSchema as S.Schema<T>);
  } else if (obj && (objOrSchema as any) === Expando) {
    return _create<T>({ ...obj } as T, meta, undefined, true);
  } else {
    // TODO(burdon): Breaks if cloned.
    return _create<T>(objOrSchema as T, meta);
  }
};

const _create = <T extends {}>(obj: T, meta?: ObjectMeta, schema?: S.Schema<T>, expando = false): ReactiveObject<T> => {
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
    if (expando) {
      _setId(obj);
    }
    _initMeta(obj, meta);
    return createReactiveProxy<T>(obj, UntypedReactiveHandler.instance as ReactiveHandler<any>);
  }
};

// TODO(dmaretskyi): UUID v8.
const _generateId = () => PublicKey.random().toHex();

/**
 * Set ID on ECHO objects (Schema and Expando).
 */
const _setId = <T extends {}>(obj: ExcludeId<T>) => {
  invariant(!('id' in (obj as any)), 'Object already has an `id` field, which is reserved.');
  (obj as any).id = _generateId();
};

const symbolMeta = Symbol.for('@dxos/meta');

/**
 * Set metadata on object.
 */
const _initMeta = <T>(obj: T, meta: ObjectMeta = { keys: [] }) => {
  prepareTypedTarget(meta, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolMeta, createReactiveProxy(meta, TypedReactiveHandler.instance as any));
};

/**
 * Get metadata from object.
 */
export const getTargetMeta = (object: any): ObjectMetaType => {
  const metadata = object[symbolMeta];
  invariant(metadata, 'Metadata not found.');
  return metadata;
};
