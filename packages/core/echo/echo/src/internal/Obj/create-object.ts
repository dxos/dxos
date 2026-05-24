//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { raise } from '@dxos/debug';
import { assertArgument, failedInvariant } from '@dxos/invariant';
import { ObjectId } from '@dxos/keys';

import { getSchemaURI, getTypeAnnotation, setTypename } from '../Annotation';
import { defineHiddenProperty } from '../common/proxy';
import { EntityKind, InstancePhantomId, KindId, MetaId, StaticTypeSchemaSlot, setSchema, setType } from '../common/types';
import {
  RelationSourceDXNId,
  RelationSourceId,
  RelationTargetDXNId,
  RelationTargetId,
  assertObjectModel,
  getObjectEchoUri,
} from '../Entity';
import { attachedTypedObjectInspector } from './inspect';
import { attachTypedJsonSerializer } from './json-serializer';

export type CreateObjectProps<T> = T extends { id: string } ? Omit<T, 'id' | KindId> & { id?: string } : T;

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
 * }).pipe(Type.object(DXN.make('com.example.type.person', '0.1.0')))
 *
 * const contact = createObject(Contact, {
 *   name: "John",
 *   email: "john@example.com",
 * })
 * ```
 */
// TODO(burdon): Make internal.
export const createObject: {
  <T>(
    input: Schema.Schema<T, any, never> | { readonly [InstancePhantomId]?: T },
    props: NoInfer<CreateObjectProps<T>>,
  ): T;
} = (input: any, props: any): any => {
  // Accept `Type.Type` entities — extract the underlying source schema from
  // the hidden slot.
  const schema = ((input as any)[StaticTypeSchemaSlot] ?? input) as Schema.Schema.AnyNoContext;
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

  // Metadata. Instance-kind is read from the schema's TypeAnnotation (set by
  // EchoObjectSchema / EchoRelationSchema / EchoTypeKindSchema): instances of
  // a type-kind meta-schema are themselves type-kind entities, etc. The
  // RelationSourceId-in-props check covers the legacy path where the schema
  // annotation isn't authoritative.
  const kind =
    annotation.kind === EntityKind.Type
      ? EntityKind.Type
      : annotation.kind === EntityKind.Relation || RelationSourceId in props
        ? EntityKind.Relation
        : EntityKind.Object;
  defineHiddenProperty(obj, KindId, kind);
  defineHiddenProperty(obj, MetaId, { keys: [] });
  setSchema(obj, schema);
  // If the caller passed a type entity (recognised via the schema slot), keep
  // a reference to it on the instance for `Obj.getType` / `Relation.getType`.
  if (input !== schema) {
    setType(obj, input);
  }
  setTypename(obj, getSchemaURI(schema) ?? failedInvariant('Missing schema URI'));
  attachTypedJsonSerializer(obj);
  attachedTypedObjectInspector(obj);

  // Relation.
  if (kind === EntityKind.Relation) {
    const sourceDXN = getObjectEchoUri(props[RelationSourceId]) ?? raise(new Error('Unresolved relation source'));
    const targetDXN = getObjectEchoUri(props[RelationTargetId]) ?? raise(new Error('Unresolved relation target'));
    defineHiddenProperty(obj, RelationSourceDXNId, sourceDXN);
    defineHiddenProperty(obj, RelationTargetDXNId, targetDXN);
  }

  assertObjectModel(obj);
  return obj;
};
