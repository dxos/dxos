//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';
import { defineHiddenProperty } from '@dxos/live-object';

import type * as Entity from '../../Entity';
import { getSchemaDXN, getTypeAnnotation, setTypename } from '../annotations';
import {
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  assertObjectModel,
  getObjectDXN,
} from '../entities';
import { EntityKind, KindId, MetaId, setSchema } from '../types';

import { attachedTypedObjectInspector } from './inspect';
import { attachTypedJsonSerializer } from './json-serializer';

export type CreateObjectProps<T> = T extends { id: string } ? Omit<T, 'id' | Entity.KindId> & { id?: string } : T;

/**
 * Creates a new object instance from a schema and data, without signal reactivity.
 * This static version creates plain JavaScript objects that are not reactive/observable.
 * For reactive objects that automatically update UI when changed, use the regular live() function.
 *
 * @param schema - The Effect schema that defines the object's structure and type, piped into EchoObjectSchema
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
 * const contact = createObject(Contact, {
 *   name: "John",
 *   email: "john@example.com",
 * })
 * ```
 */
// TODO(burdon): Make internal.
export const createObject = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
  props: CreateObjectProps<Schema.Schema.Type<S>>,
): CreateObjectProps<Schema.Schema.Type<S>> & { id: string; [KindId]: EntityKind } => {
  const annotation = getTypeAnnotation(schema);
  if (!annotation) {
    throw new Error('Schema is not an ECHO schema');
  }
  assertArgument(!('@type' in props), 'data', '@type is not allowed');
  assertArgument(!(RelationSourceDXNId in props), 'data', 'Relation source DXN is not allowed in the constructor');
  assertArgument(!(RelationTargetDXNId in props), 'data', 'Relation target DXN is not allowed in the constructor');
  assertArgument(
    RelationSourceId in props === RelationTargetId in props,
    'data',
    'Relation source and target must be provided together',
  );

  // Raw object.
  const obj = { ...props, id: props.id ?? ObjectId.random() };

  // Metadata.
  const kind = RelationSourceId in props ? EntityKind.Relation : EntityKind.Object;
  defineHiddenProperty(obj, KindId, kind);
  defineHiddenProperty(obj, MetaId, { keys: [] });
  setSchema(obj, schema);
  setTypename(obj, getSchemaDXN(schema) ?? failedInvariant('Missing schema DXN'));
  attachTypedJsonSerializer(obj);
  attachedTypedObjectInspector(obj);

  // Relation.
  if (kind === EntityKind.Relation) {
    const sourceDXN = getObjectDXN(props[RelationSourceId]) ?? raise(new Error('Unresolved relation source'));
    const targetDXN = getObjectDXN(props[RelationTargetId]) ?? raise(new Error('Unresolved relation target'));
    defineHiddenProperty(obj, RelationSourceDXNId, sourceDXN);
    defineHiddenProperty(obj, RelationTargetDXNId, targetDXN);
  }

  assertObjectModel(obj);
  return obj;
};
