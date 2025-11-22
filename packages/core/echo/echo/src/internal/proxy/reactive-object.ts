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
import { Expando } from '../entities';
import { attachTypedJsonSerializer } from '../object';
import { type AnyProperties, EntityKindId, MetaId, type ObjectMeta, ObjectMetaSchema } from '../types';

import { TypedReactiveHandler, prepareTypedTarget } from './typed-handler';

/**
 * Properties that are required for object creation.
 */
export type MakeProps<T extends AnyProperties> = Omit<T, 'id' | typeof EntityKindId>;

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 *
 * @internal
 */
// TODO(burdon): Rename make.
// TODO(dmaretskyi): Deep mutability.
// TODO(dmaretskyi): Invert generics (generic over schema) to have better error messages.
// TODO(dmaretskyi): Could mutate original object making it unusable.
export const createLiveObject: {
  <T extends AnyProperties>(obj: T): Live<T>;
  <T extends AnyProperties>(
    schema: Schema.Schema<T, any, never>,
    obj: NoInfer<MakeProps<T>>,
    meta?: ObjectMeta,
  ): Live<T>;
} = <T extends AnyProperties>(
  objOrSchema: Schema.Schema<T, any> | T,
  obj?: MakeProps<T>,
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

const createReactiveObject = <T extends AnyProperties>(
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
