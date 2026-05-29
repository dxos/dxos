//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { ObjectId } from '@dxos/keys';

import { getTypeAnnotation } from '../../Annotation';
import {
  type AnyProperties,
  KindId,
  MetaId,
  type ObjectMeta,
  ObjectMetaSchema,
  ParentId,
  SchemaKindId,
  StaticTypeSchemaSlot,
} from '../types';
import { defineHiddenProperty } from './define-hidden-property';
import { attachTypedJsonSerializer } from './json-serializer';
import { createProxy, getProxyTarget, isValidProxyTarget } from './proxy-utils';
import { TypeSource, TypedReactiveHandler, prepareTypedTarget, setMetaOwner } from './typed-handler';

/**
 *
 */
// TODO(burdon): Make internal
// Omits the brand slots — those get stamped on the instance by the entity
// handler (KindId via setKind, SchemaKindId derived in the proxy `get` trap
// from kind + jsonSchema.entityKind, StaticTypeSchemaSlot lazily via the
// proxy), not supplied by the caller.
export type MakeObjectProps<T extends AnyProperties> = Omit<T, 'id' | KindId | SchemaKindId | StaticTypeSchemaSlot>;

/**
 * Creates a reactive object from a plain Javascript object.
 * Requires a TS-effect schema.
 *
 * Callers that have a `Type.Type` entity (not a raw schema) must unwrap it
 * themselves — `Obj.make` / `Relation.make` do this via `Type.getSchema(...)`
 * and pass the entity through as `typeSource` so the instance carries a
 * back-reference for `Obj.getType` and resolves the live source schema
 * uniformly via the entity's `[StaticTypeSchemaSlot]`.
 */
// TODO(burdon): Make internal
// TODO(dmaretskyi): Deep mutability.
// TODO(dmaretskyi): Invert generics (generic over schema) to have better error messages.
// TODO(dmaretskyi): Could mutate original object making it unusable.
export const makeObject = <T extends AnyProperties>(
  schema: Schema.Schema<T, any, never>,
  obj: NoInfer<MakeObjectProps<T>>,
  meta?: ObjectMeta,
  typeSource?: TypeSource,
): T => {
  // Use Object.assign to copy symbol properties (like ParentId) that spread operator doesn't copy.
  return createReactiveObject<T>(Object.assign({}, obj) as T, meta, schema as Schema.Schema<T, any>, typeSource);
};

const createReactiveObject = <T extends AnyProperties>(
  obj: T,
  meta?: ObjectMeta,
  schema?: Schema.Schema<T>,
  typeSource?: TypeSource,
): T => {
  if (!isValidProxyTarget(obj)) {
    throw new Error('Value cannot be made into a reactive object.');
  }

  if (!schema) {
    throw new Error('Schema is required for reactive objects. Use Atom for untyped reactive state.');
  }

  // Extract parent from props (can be set via [Obj.Parent]).
  const parent = (obj as any)[ParentId];
  if (parent !== undefined) {
    delete (obj as any)[ParentId];
  }

  const annotation = getTypeAnnotation(schema);
  if (annotation) {
    setIdOnTarget(obj);
    defineHiddenProperty(obj, KindId, annotation.kind);
  }
  initMeta(obj, meta);
  if (parent !== undefined) {
    defineHiddenProperty(obj, ParentId, parent);
  }
  prepareTypedTarget(obj, schema, typeSource);
  attachTypedJsonSerializer(obj);
  const proxy = createProxy<T>(obj, TypedReactiveHandler.instance);

  // Set meta's owner to the main object so meta mutations respect the parent's change context.
  // For non-database objects using TypedReactiveHandler, this links the meta to the main object's
  // change context. For database objects, meta is handled by EchoReactiveHandler.getMeta().
  const metaProxy = (obj as any)[MetaId];
  if (metaProxy) {
    const metaTarget = getProxyTarget(metaProxy);
    if (metaTarget) {
      setMetaOwner(metaTarget, obj);
    }
  }

  return proxy;
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
