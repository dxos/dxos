//
// Copyright 2025 DXOS.org
//

import { type Schema as S } from 'effect';

import { failedInvariant } from '@dxos/invariant';

import { attachTypedJsonSerializer } from './json-serializer';
import { ObjectId } from './object-id';
import { setTypename } from './typename';
import { setSchema, getObjectAnnotation } from '../ast';
import { getSchemaDXN } from '../types';

type CreateData<T> = T extends { id: string } ? Omit<T, 'id'> & { id?: string } : T;

/**
 * Creates a new object instance from a schema and data, without signal reactivity.
 * This static version creates plain JavaScript objects that are not reactive/observable.
 * For reactive objects that automatically update UI when changed, use the regular create() function.
 *
 * @param schema - The Effect schema that defines the object's structure and type, piped into EchoObject
 * @param data - The data to initialize the object with. The id and @type fields are handled automatically.
 * @returns A new non-reactive object instance conforming to the schema
 * @throws {Error} If the schema is not an object schema
 * @throws {TypeError} If data contains an @type field
 *
 * @example
 * ```ts
 * const Contact = S.sSruct({
 *   name: S.string,
 *   email: S.string
 * }).pipe(
 *   EchoObject('example.com/type/Contact', '0.1.0')
 * )
 *
 * // Creates a non-reactive contact object
 * const contact = createStatic(Contact, {
 *   name: "John",
 *   email: "john@example.com"
 * })
 * ```
 */
// TODO(dmaretskyi): Rename to `create` once existing `create` is renamed to `live`.
export const createStatic = <Schema extends S.Schema.AnyNoContext>(
  schema: Schema,
  data: CreateData<S.Schema.Type<Schema>>,
  // TODO(burdon): Return type.
): CreateData<S.Schema.Type<Schema>> & { id: string } => {
  const annotation = getObjectAnnotation(schema);
  if (!annotation) {
    throw new Error('Schema is not an object schema');
  }
  if ('@type' in data) {
    throw new TypeError('@type is not allowed in createStatic');
  }

  const obj = {
    id: data.id ?? ObjectId.random(),
    ...data,
  };

  setTypename(obj, getSchemaDXN(schema)?.toString() ?? failedInvariant('Failed to get schema DXN'));
  setSchema(obj, schema);
  attachTypedJsonSerializer(obj);
  return obj;
};
