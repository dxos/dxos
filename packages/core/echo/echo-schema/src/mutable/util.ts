//
// Copyright 2024 DXOS.org
//

import { type S } from '@dxos/effect';

import { StoredSchema } from './types';
import { create } from '../handler';
import { type JsonSchemaType, createJsonSchema, toJsonSchema } from '../json';
import { type ReactiveObject } from '../types';

/**
 * Create empty stored schema.
 */
export const createStoredSchema = (typename: string, version: string): ReactiveObject<StoredSchema> => {
  return create(StoredSchema, {
    jsonSchema: createJsonSchema(),
    typename,
    version,
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
