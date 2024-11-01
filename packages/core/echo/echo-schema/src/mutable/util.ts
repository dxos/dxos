//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { StoredSchema } from './types';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '../ast';
import { create } from '../handler';
import { type JsonSchemaType, toJsonSchema } from '../json';
import { type ReactiveObject } from '../types';

// TODO(burdon): Move to different file?

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * @example $.name
 */
export type JsonPath = string & { __JsonPath: true };

/**
 *
 */
// TODO(burdon): Move to json.
export const createEmptyJsonSchema = () => {
  const schema = toJsonSchema(S.Struct({}));
  schema.type = 'object';
  return schema;
};

/**
 *
 */
// TODO(burdon): Rename createSchema.
export const createEmptySchema = (typename: string, version: string): ReactiveObject<StoredSchema> => {
  return create(StoredSchema, {
    typename,
    version,
    jsonSchema: createEmptyJsonSchema(),
  });
};

/**
 * Set or update property.
 */
export const setProperty = (schema: JsonSchemaType, property: string, type: S.Schema.Any) => {
  const jsonSchema = toJsonSchema(type as S.Schema<any>);
  // TODO(burdon): Is this required?
  delete (jsonSchema as any).$schema; // Remove $schema on leaf nodes.
  (schema as any).properties ??= {};
  (schema as any).properties[property] = jsonSchema;
};

/**
 * Delete property.
 */
export const deleteProperty = (schema: JsonSchemaType, property: string) => {
  delete (schema as any).properties[property];
};

/**
 *
 */
// TODO(burdon): Change annotation to FQ symbol?
export const setAnnotation = (schema: JsonSchemaType, property: string, annotation: string, value: any) => {
  (schema as any).properties[property].$echo ??= {};
  (schema as any).properties[property].$echo.annotations ??= {};
  (schema as any).properties[property].$echo.annotations[annotation] ??= {};
  Object.assign((schema as any).properties[property].$echo.annotations[annotation], value);
};

/**
 *
 */
export const deleteAnnotation = (schema: JsonSchemaType, property: string, annotation: string) => {
  const annotations = (schema as any).properties[property]?.$echo?.annotations;
  if (annotation) {
    delete annotations[annotation];
  }
};

/**
 *
 */
// TODO(burdon): Rename createReferenceAnnotation?
export const dynamicRef = (obj: StoredSchema): S.Schema.AnyNoContext => {
  return S.Any.annotations({
    [ReferenceAnnotationId]: {
      schemaId: obj.id,
      typename: obj.typename,
      version: obj.version,
    } satisfies ReferenceAnnotationValue,
  });
};
