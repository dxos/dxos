//
// Copyright 2025 DXOS.org
//

import { JsonSchemaFields, type JsonSchemaType } from './json-schema-type';

/**
 * Normalize schema to to draft-07 format.
 * Note: the input type does not necessarily match the {@link JsonSchemaType} type.
 */
export const normalizeSchema = (schema: JsonSchemaType): JsonSchemaType => {
  const copy = structuredClone(schema);
  go(copy);
  return copy;
};

const go = (schema: JsonSchemaType) => {
  if (typeof schema !== 'object' || schema === null) {
    return;
  }

  if ((schema as any).exclusiveMaximum === true) {
    schema.exclusiveMaximum = schema.maximum;
    delete (schema as any).exclusiveMaximum;
  } else if ((schema as any).exclusiveMaximum === false) {
    delete (schema as any).exclusiveMaximum;
  }

  if ((schema as any).exclusiveMinimum === true) {
    schema.exclusiveMinimum = schema.minimum;
    delete (schema as any).exclusiveMinimum;
  } else if ((schema as any).exclusiveMinimum === false) {
    delete (schema as any).exclusiveMinimum;
  }

  // Delete all properties that are not in the JsonSchemaFields.
  for (const key of Object.keys(schema)) {
    if (!JsonSchemaFields.includes(key)) {
      delete (schema as any)[key];
    }
  }

  // Recursively normalize the schema.
  // Recursively normalize the schema.
  if (schema.properties) {
    goOnRecord(schema.properties);
  }
  if (schema.patternProperties) {
    goOnRecord(schema.patternProperties);
  }
  if (schema.propertyNames) {
    go(schema.propertyNames);
  }
  if (schema.definitions) {
    goOnRecord(schema.definitions);
  }
  if (schema.items) {
    maybeGoOnArray(schema.items);
  }
  if (schema.additionalItems) {
    maybeGoOnArray(schema.additionalItems);
  }
  if (schema.contains) {
    go(schema.contains);
  }
  if (schema.if) {
    go(schema.if);
  }
  if (schema.then) {
    go(schema.then);
  }
  if (schema.else) {
    go(schema.else);
  }
  if (schema.allOf) {
    maybeGoOnArray(schema.allOf);
  }
  if (schema.anyOf) {
    maybeGoOnArray(schema.anyOf);
  }
  if (schema.oneOf) {
    maybeGoOnArray(schema.oneOf);
  }
  if (schema.not) {
    go(schema.not);
  }
  if (schema.$defs) {
    goOnRecord(schema.$defs);
  }
  if (schema.reference) {
    go(schema.reference.schema);
  }
};

const maybeGoOnArray = (value: any) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      go(item);
    }
  } else if (typeof value === 'object' && value !== null) {
    go(value);
  }
};

const goOnRecord = (record: Record<string, any>) => {
  for (const key of Object.keys(record)) {
    go(record[key]);
  }
};
