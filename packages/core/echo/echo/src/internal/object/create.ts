//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { defineHiddenProperty } from '@dxos/live-object';

import { EntityKind, getSchemaDXN, getTypeAnnotation } from '../ast';
import { RelationSourceDXNId, RelationSourceId, RelationTargetDXNId, RelationTargetId } from '../entities';
import { EntityKindId, MetaId, assertObjectModelShape, getObjectDXN, setSchema, setTypename } from '../types';

import { attachedTypedObjectInspector } from './inspect';
import { attachTypedJsonSerializer } from './json-serializer';

// Make `id` optional.
type CreateData<T> = T extends { id: string } ? Omit<T, 'id' | typeof EntityKindId> & { id?: string } : T;

/**
 * Creates a new object instance from a schema and data, without signal reactivity.
 * This static version creates plain JavaScript objects that are not reactive/observable.
 * For reactive objects that automatically update UI when changed, use the regular live() function.
 *
 * @param schema - The Effect schema that defines the object's structure and type, piped into EchoObject
 * @param data - The data to initialize the object with. The id and @type fields are handled automatically.
 * @returns A new non-reactive object instance conforming to the schema
 * @throws {Error} If the schema is not an object schema
 * @throws {TypeError} If data contains an @type field
 *
 * @example
 * ```ts
 * const Contact = Schema.Struct({
 *   name: Schema.String,
 *   email: Schema.String,
 * }).pipe(Type.Obj({
 *   typename: 'example.com/type/Person',
 *   version: '0.1.0',
 * }))
 *
 * // Creates a non-reactive contact object
 * const contact = create(Contact, {
 *   name: "John",
 *   email: "john@example.com",
 * })
 * ```
 */
// TODO(burdon): Handle defaults (see Schema.make).
// TODO(dmaretskyi): Use `Obj.make` and `Relation.make` from '@dxos/echo' instead.
export const createObject = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
  data: CreateData<Schema.Schema.Type<S>>,
): CreateData<Schema.Schema.Type<S>> & { id: string } => {
  const annotation = getTypeAnnotation(schema);
  if (!annotation) {
    throw new Error('Schema is not an object schema');
  }
  assertArgument(!('@type' in data), 'data', '@type is not allowed');
  assertArgument(!(RelationSourceDXNId in data), 'data', 'Relation source DXN is not allowed in the constructor');
  assertArgument(!(RelationTargetDXNId in data), 'data', 'Relation target DXN is not allowed in the constructor');
  assertArgument(
    RelationSourceId in data === RelationTargetId in data,
    'data',
    'Relation source and target must be provided together',
  );

  const obj = { ...data, id: data.id ?? ObjectId.random() };
  const kind = RelationSourceId in data ? EntityKind.Relation : EntityKind.Object;
  defineHiddenProperty(obj, EntityKindId, kind);
  setTypename(obj, getSchemaDXN(schema) ?? failedInvariant('Missing schema DXN'));
  setSchema(obj, schema);
  attachTypedJsonSerializer(obj);
  attachedTypedObjectInspector(obj);
  defineHiddenProperty(obj, MetaId, { keys: [] });
  if (kind === EntityKind.Relation) {
    const sourceDXN = getObjectDXN(data[RelationSourceId]) ?? raise(new Error('Unresolved relation source'));
    const targetDXN = getObjectDXN(data[RelationTargetId]) ?? raise(new Error('Unresolved relation target'));
    defineHiddenProperty(obj, RelationSourceDXNId, sourceDXN);
    defineHiddenProperty(obj, RelationTargetDXNId, targetDXN);
  }

  assertObjectModelShape(obj);
  return obj;
};
