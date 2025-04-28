//
// Copyright 2024 DXOS.org
//

import { type Schema as S } from 'effect';

import {
  createObjectId,
  defineHiddenProperty,
  getTypeAnnotation,
  type BaseObject,
  type ExcludeId,
  Expando,
  type ObjectMeta,
  ObjectMetaSchema,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import type { Live } from './live';
import { createProxy, isValidProxyTarget } from './proxy';
import { prepareTypedTarget, TypedReactiveHandler } from './typed-handler';
import { UntypedReactiveHandler } from './untyped-handler';

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(dmaretskyi): Deep mutability.
// TODO(dmaretskyi): Invert generics (generic over schema) to have better error messages.
export const live: {
  <T extends BaseObject>(obj: T): Live<T>;
  <T extends BaseObject>(schema: S.Schema<T, any, never>, obj: NoInfer<ExcludeId<T>>, meta?: ObjectMeta): Live<T>;
} = <T extends BaseObject>(
  objOrSchema: S.Schema<T, any> | T,
  // TODO(burdon): Handle defaults.
  obj?: ExcludeId<T>,
  meta?: ObjectMeta,
): Live<T> => {
  if (obj && (objOrSchema as any) !== Expando) {
    return createReactiveObject<T>({ ...obj } as T, meta, objOrSchema as S.Schema<T, any>);
  } else if (obj && (objOrSchema as any) === Expando) {
    return createReactiveObject<T>({ ...obj } as T, meta, undefined, { expando: true });
  } else {
    return createReactiveObject<T>(objOrSchema as T, meta);
  }
};

const createReactiveObject = <T extends BaseObject>(
  obj: T,
  meta?: ObjectMeta,
  schema?: S.Schema<T>,
  options?: { expando?: boolean },
): Live<T> => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  if (schema) {
    const shouldGenerateId = options?.expando || getTypeAnnotation(schema);
    if (shouldGenerateId) {
      setIdOnTarget(obj);
    }
    initMeta(obj, meta);
    prepareTypedTarget(obj, schema);
    return createProxy<T>(obj, TypedReactiveHandler.instance);
  } else {
    if (options?.expando) {
      setIdOnTarget(obj);
    }
    initMeta(obj, meta);
    return createProxy<T>(obj, UntypedReactiveHandler.instance);
  }
};

/**
 * Set ID on ECHO object targets during creation.
 * Used for objects with schema and the ones explicitly marked as Expando.
 */
const setIdOnTarget = (target: any) => {
  invariant(!('id' in target), 'Object already has an `id` field, which is reserved.');
  target.id = createObjectId();
};

const symbolMeta = Symbol.for('@dxos/schema/ObjectMeta');

/**
 * Set metadata on object.
 */
const initMeta = <T>(obj: T, meta: ObjectMeta = { keys: [] }) => {
  prepareTypedTarget(meta, ObjectMetaSchema);
  defineHiddenProperty(obj, symbolMeta, createProxy(meta, TypedReactiveHandler.instance as any));
};

/**
 * Get metadata from object.
 * @internal
 */
export const getObjectMeta = (object: any): ObjectMeta => {
  const metadata = object[symbolMeta];
  invariant(metadata, 'ObjectMeta not found.');
  return metadata;
};
