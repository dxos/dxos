//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/keys';
import {
  type Live,
  UntypedReactiveHandler,
  createProxy,
  defineHiddenProperty,
  isValidProxyTarget,
} from '@dxos/live-object';

import { getTypeAnnotation } from '../ast';
import { EntityKindId, Expando, MetaId, type ObjectMeta, ObjectMetaSchema, attachTypedJsonSerializer } from '../object';
import type { BaseObject, CreationProps } from '../types';

import { TypedReactiveHandler, prepareTypedTarget } from './typed-handler';

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 *
 * @depreacted Use `Obj.make`.
 */
// TODO(dmaretskyi): Deep mutability.
// TODO(dmaretskyi): Invert generics (generic over schema) to have better error messages.
// TODO(dmaretskyi): Could mutate original object making it unusable.
// TODO(burdon): Use Schema.make() to handle defaults?
export const live: {
  <T extends BaseObject>(obj: T): Live<T>;
  <T extends BaseObject>(
    schema: Schema.Schema<T, any, never>,
    obj: NoInfer<CreationProps<T>>,
    meta?: ObjectMeta,
  ): Live<T>;
} = <T extends BaseObject>(
  objOrSchema: Schema.Schema<T, any> | T,
  obj?: CreationProps<T>,
  meta?: ObjectMeta,
): Live<T> => {
  // TODO(dmaretskyi): Remove Expando special case.
  if (obj && (objOrSchema as any) !== Expando) {
    return createReactiveObject<T>({ ...obj } as T, meta, objOrSchema as Schema.Schema<T, any>);
  } else if (obj && (objOrSchema as any) === Expando) {
    return createReactiveObject<T>({ ...obj } as T, meta, undefined, { expando: true });
  } else {
    return createReactiveObject<T>(objOrSchema as T, meta);
  }
};

const createReactiveObject = <T extends BaseObject>(
  obj: T,
  meta?: ObjectMeta,
  schema?: Schema.Schema<T>,
  options?: { expando?: boolean },
): Live<T> => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  if (schema) {
    const annotation = getTypeAnnotation(schema);
    const shouldGenerateId = options?.expando || !!annotation;
    if (shouldGenerateId) {
      setIdOnTarget(obj);
    }
    if (annotation) {
      defineHiddenProperty(obj, EntityKindId, annotation.kind);
    }
    initMeta(obj, meta);
    prepareTypedTarget(obj, schema);
    attachTypedJsonSerializer(obj);
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
  // invariant(!('id' in target), 'Object already has an `id` field, which is reserved.');
  if ('id' in target && target.id !== undefined && target.id !== null) {
    if (!ObjectId.isValid(target.id)) {
      throw new Error('Invalid object id format.');
    }
  } else {
    target.id = ObjectId.random();
  }
};

/**
 * Set metadata on object.
 */
// TODO(dmaretskyi): Move to echo-schema.
const initMeta = <T>(obj: T, meta: ObjectMeta = { keys: [] }) => {
  prepareTypedTarget(meta, ObjectMetaSchema);
  defineHiddenProperty(obj, MetaId, createProxy(meta, TypedReactiveHandler.instance as any));
};
