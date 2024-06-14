//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import { ulidFactory } from 'ulid-workers';

import { invariant } from '@dxos/invariant';

import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';
import { getEchoObjectAnnotation } from '../annotations';
import { Expando } from '../expando';
import { createReactiveProxy, getProxyHandlerSlot, isValidProxyTarget, type ReactiveHandler } from '../proxy';
import { type ExcludeId, type ObjectMeta, ObjectMetaSchema, type ReactiveObject } from '../types';
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
    return _create<T>({ ...obj } as T, meta, undefined, { expando: true });
  } else {
    // TODO(burdon): Breaks if cloned?
    return _create<T>(objOrSchema as T, meta);
  }
};

const _create = <T extends {}>(
  obj: T,
  meta?: ObjectMeta,
  schema?: S.Schema<T>,
  options?: { expando?: boolean },
): ReactiveObject<T> => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  if (schema) {
    const shouldGenerateId = options?.expando || getEchoObjectAnnotation(schema);
    if (shouldGenerateId) {
      setIdOnTarget(obj);
    }
    initMeta(obj, meta);
    prepareTypedTarget(obj, schema);
    return createReactiveProxy<T>(obj, TypedReactiveHandler.instance as ReactiveHandler<any>);
  } else {
    if (options?.expando) {
      setIdOnTarget(obj);
    }
    initMeta(obj, meta);
    return createReactiveProxy<T>(obj, UntypedReactiveHandler.instance as ReactiveHandler<any>);
  }
};

const ulid = ulidFactory({ monotonic: false });
export const generateEchoId = () => ulid();

/**
 * Set ID on ECHO object targets during creation.
 * Used for objects with schema and the ones explicitly marked as Expando.
 */
const setIdOnTarget = (target: any) => {
  invariant(!('id' in target), 'Object already has an `id` field, which is reserved.');
  target.id = generateEchoId();
};

const symbolMeta = Symbol.for('@dxos/meta');

/**
 * Set metadata on object.
 */
const initMeta = <T>(obj: T, meta: ObjectMeta = { keys: [] }) => {
  prepareTypedTarget(meta, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolMeta, createReactiveProxy(meta, TypedReactiveHandler.instance as any));
};

/**
 * Get metadata from object.
 * @internal
 */
export const getTargetMeta = (object: any): ObjectMeta => {
  const metadata = object[symbolMeta];
  invariant(metadata, 'Metadata not found.');
  return metadata;
};

/**
 * Unsafe method to override id for debugging/testing and migration purposes.
 *
 * @deprecated
 */
export const dangerouslyAssignProxyId = <T>(obj: ReactiveObject<T>, id: string) => {
  (getProxyHandlerSlot(obj).target as any).id = id;
};
