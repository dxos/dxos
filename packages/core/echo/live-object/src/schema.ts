import {
  createJsonSchema,
  EchoObject,
  getObjectAnnotation,
  MutableSchema,
  ObjectAnnotationId,
  StoredSchema,
  toJsonSchema,
  type ObjectAnnotation,
  type ReactiveObject,
} from '@dxos/echo-schema';
import { Schema as S } from '@effect/schema';
import { create } from './object';

/**
 * Create ECHO object representing schema.
 */
export const createStoredSchema = ({
  typename,
  version,
  jsonSchema,
}: Pick<StoredSchema, 'typename' | 'version'> &
  Partial<Pick<StoredSchema, 'jsonSchema'>>): ReactiveObject<StoredSchema> => {
  return create(StoredSchema, {
    typename,
    version,
    jsonSchema: jsonSchema ?? createJsonSchema(),
  });
};

/**
 * Create runtime representation of a schema.
 */
export const createMutableSchema = (
  { typename, version }: ObjectAnnotation,
  fields: S.Struct.Fields,
): MutableSchema => {
  const schema = S.partial(S.Struct(fields).omit('id')).pipe(EchoObject(typename, version));
  const objectAnnotation = getObjectAnnotation(schema);
  const schemaObject = createStoredSchema({ typename, version });
  const updatedSchema = schema.annotations({
    [ObjectAnnotationId]: { ...objectAnnotation, schemaId: schemaObject.id },
  });

  schemaObject.jsonSchema = toJsonSchema(updatedSchema);
  return new MutableSchema(schemaObject);
};
