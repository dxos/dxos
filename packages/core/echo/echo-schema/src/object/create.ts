//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';

import { failedInvariant } from '@dxos/invariant';

import { ObjectId } from './ids';
import { attachedTypedObjectInspector } from './inspect';
import { attachTypedJsonSerializer } from './json-serializer';
import { setTypename } from './typename';
import { getSchemaDXN, getTypeAnnotation, setSchema } from '../ast';

// Make `id` optional.
type CreateData<T> = T extends { id: string } ? Omit<T, 'id'> & { id?: string } : T;

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
 * }).pipe(Type.def({
 *   typename: 'example.com/type/Contact',
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
// TODO(dmaretskyi): Rename to `create` once existing `create` is renamed to `live`.
export const create = <S extends Schema.Schema.AnyNoContext>(
  schema: S,
  data: CreateData<Schema.Schema.Type<S>>,
): CreateData<Schema.Schema.Type<S>> & { id: string } => {
  const annotation = getTypeAnnotation(schema);
  if (!annotation) {
    throw new Error('Schema is not an object schema');
  }
  if ('@type' in data) {
    throw new TypeError('@type is not allowed');
  }

  const obj = { ...data, id: data.id ?? ObjectId.random() };
  setTypename(obj, getSchemaDXN(schema)?.toString() ?? failedInvariant('Missing schema DXN'));
  setSchema(obj, schema);
  attachTypedJsonSerializer(obj);
  attachedTypedObjectInspector(obj);
  return obj;
};
