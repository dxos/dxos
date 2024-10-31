//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { StoredSchema } from './types';
import { ReferenceAnnotationId, type ReferenceAnnotationValue } from '../ast';
import { create } from '../handler';
import { type JsonSchemaType, effectToJsonSchema } from '../json';
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
  const schema = effectToJsonSchema(S.Struct({}));
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
 *
 */
export const setProperty = (schema: JsonSchemaType, property: string, type: S.Schema.Any) => {
  const jsonSchema = effectToJsonSchema(type as S.Schema<any>);
  delete jsonSchema.$schema; // Remove $schema on leaf nodes.
  (schema as any).properties ??= {};
  (schema as any).properties[property] = jsonSchema;
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
