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

//
// Properties
//

export const getProperty: any | undefined = (schema: JsonSchemaType, property: string) => {
  return (schema as any).properties[property];
}

export const setProperty = (schema: JsonSchemaType, property: string, type: S.Schema.Any) => {
  const jsonSchema = toJsonSchema(type as S.Schema<any>);
  // TODO(burdon): Is this required?
  delete (jsonSchema as any).$schema; // Remove $schema on leaf nodes.
  (schema as any).properties ??= {};
  (schema as any).properties[property] = jsonSchema;
};

export const deleteProperty = (schema: JsonSchemaType, property: string) => {
  delete (schema as any).properties[property];
};

//
// Annotations
//

export const getAnnotation: any | undefined = (schema: JsonSchemaType, property: string, annotationId: symbol) => {
  const p = (schema as any).properties[property];
  return p.echo.annotations?.[annotationId];
}

// TODO(burdon): Normalize to use regular annotations.
export const setAnnotation = (schema: JsonSchemaType, property: string, annotations: Record<symbol, any>) => {
  const p = (schema as any).properties[property];
  p.echo ??= {};
  p.echo.annotations ??= {};
  for (const [key, value] of Object.entries(annotations)) {
    p.echo.annotations[key] = value;
  }
};

export const deleteAnnotation = (schema: JsonSchemaType, property: string, annotation: string) => {
  const annotations = (schema as any).properties[property]?.echo?.annotations;
  if (annotation) {
    delete annotations[annotation];
  }
};
