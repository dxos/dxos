//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/keys';

import { getTypeAnnotation } from '../annotations';
import { Expando } from '../entities';
import { attachTypedJsonSerializer } from '../object';
import { type AnyProperties, KindId, MetaId, type ObjectMeta, ObjectMetaSchema } from '../types';

import { defineHiddenProperty } from './define-hidden-property';
import { createProxy, isValidProxyTarget } from './proxy-utils';
import { TypedReactiveHandler, prepareTypedTarget } from './typed-handler';

/**
 *
 */
// TODO(burdon): Make internal
export type MakeObjectProps<T extends AnyProperties> = Omit<T, 'id' | KindId>;

/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(burdon): Make internal
// TODO(dmaretskyi): Deep mutability.
// TODO(dmaretskyi): Invert generics (generic over schema) to have better error messages.
// TODO(dmaretskyi): Could mutate original object making it unusable.
export const makeObject: {
  <T extends AnyProperties>(obj: T): T;
  <T extends AnyProperties>(
    schema: Schema.Schema<T, any, never>,
    obj: NoInfer<MakeObjectProps<T>>,
    meta?: ObjectMeta,
  ): T;
} = <T extends AnyProperties>(
  objOrSchema: Schema.Schema<T, any> | T,
  obj?: MakeObjectProps<T>,
  meta?: ObjectMeta,
): T => {
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
): T => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  if (!schema && !options?.expando) {
    throw new Error('Schema is required for reactive objects. Use Atom for untyped reactive state.');
  }

  // Use Expando schema if the expando option is set but no schema provided.
  const effectiveSchema = schema ?? (options?.expando ? (Expando as unknown as Schema.Schema<T>) : undefined);

  const annotation = effectiveSchema ? getTypeAnnotation(effectiveSchema) : undefined;
  const shouldGenerateId = options?.expando || !!annotation;
  if (shouldGenerateId) {
    setIdOnTarget(obj);
  }
  if (annotation) {
    defineHiddenProperty(obj, KindId, annotation.kind);
  }
  initMeta(obj, meta);
  if (effectiveSchema) {
    prepareTypedTarget(obj, effectiveSchema);
    attachTypedJsonSerializer(obj);
  }
  return createProxy<T>(obj, TypedReactiveHandler.instance);
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
