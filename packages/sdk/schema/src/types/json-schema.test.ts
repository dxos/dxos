//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type JsonSchema } from 'json-schema-library';
import { describe, test } from 'vitest';

import { JsonSchema as JsonSchemaUtil } from '@dxos/echo';

const TestSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.optional(Schema.Number),
  identities: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        type: Schema.Literal('email', 'phone'),
        value: Schema.String,
      }),
    ),
  ),
});

describe('json-schema', () => {
  test.only('encode/decode', () => {
    const json = JsonSchemaUtil.toJsonSchema(TestSchema);
    traverseJsonSchema(json, (schema, context) => {
      console.log(context.pointer.padEnd(50), schema.type.padEnd(10), isSchemaOptional(context));
    });

    // console.log(JSON.stringify(json, null, 2));
  });
});

export type SchemaContext = {
  parentSchema: JsonSchema | null;
  propertyNameOrIndex: string | number | null;
  pointer: string;
};

/**
 * Visitor callback function executed for each sub-schema found during traversal.
 * @param schema The current sub-schema being visited.
 * @param context Information about the schema's position (parent, key/index, pointer).
 */
export type ContextualVisitorCallback = (schema: JsonSchema, context: SchemaContext) => void;

/**
 * Recursive traversal.
 */
export function traverseJsonSchema(
  schema: JsonSchema,
  callback: ContextualVisitorCallback,
  path: string = '#',
  parentSchema: JsonSchema | null = null,
  propertyNameOrIndex: string | number | null = null,
): void {
  const context: SchemaContext = {
    parentSchema,
    propertyNameOrIndex,
    pointer: path,
  };

  callback(schema, context);

  // Check for Object properties.
  if (schema.properties && typeof schema.properties === 'object') {
    for (const key in schema.properties) {
      if (Object.prototype.hasOwnProperty.call(schema.properties, key)) {
        const subSchema = schema.properties[key] as JsonSchema;
        traverseJsonSchema(subSchema, callback, `${path}/properties/${key}`, schema, key);
      }
    }
  }

  // Check for Array items (list or tuple validation).
  if (schema.items) {
    if (Array.isArray(schema.items)) {
      // Tuple validation.
      schema.items.forEach((itemSchema, index) => {
        traverseJsonSchema(itemSchema as JsonSchema, callback, `${path}/items/${index}`, schema, index);
      });
    } else {
      // List validation.
      traverseJsonSchema(schema.items as JsonSchema, callback, `${path}/items`, schema, 'items');
    }
  }

  // Handle complex logic (oneOf, anyOf, allOf) - These elements are typically always "required" in context.
  const combinators = ['oneOf', 'anyOf', 'allOf'] as const;
  for (const keyword of combinators) {
    if (schema[keyword] && Array.isArray(schema[keyword])) {
      (schema[keyword] as JsonSchema[]).forEach((subSchema, index) => {
        traverseJsonSchema(subSchema, callback, `${path}/${keyword}/${index}`, schema, index);
      });
    }
  }
}

/**
 * Determines if a schema is optional based on its parent's structure and constraints.
 * * @param context The contextual information provided by the traverseJsonSchema function.
 * @returns true if the schema is optional, false otherwise (required or root).
 */
export function isSchemaOptional(context: SchemaContext): boolean {
  const { parentSchema, propertyNameOrIndex } = context;

  // 1. Root Schema is neither optional nor required (it just is).
  if (!parentSchema || propertyNameOrIndex === null) {
    return false;
  }

  // 2. Check Object Properties.
  // Optional if the parent is an object and the key is NOT in 'required'.
  if (
    typeof propertyNameOrIndex === 'string' &&
    parentSchema.type === 'object' &&
    parentSchema.properties &&
    Object.keys(parentSchema.properties).includes(propertyNameOrIndex)
  ) {
    const required = parentSchema.required || [];
    // If the key is NOT in the required array, it is optional.
    return !required.includes(propertyNameOrIndex);
  }

  // 3. Check Array Tuple Items.
  // Optional if the parent is an array, using tuple definition, and index >= minItems.
  if (
    typeof propertyNameOrIndex === 'number' &&
    parentSchema.type === 'array' &&
    Array.isArray(parentSchema.items) // Must be tuple definition.
  ) {
    const minItems = parentSchema.minItems || 0;
    // If the index is equal to or greater than minItems, it is optional.
    return propertyNameOrIndex >= minItems;
  }

  // 4. Other contexts (e.g., items for list validation, oneOf/allOf components).
  // For most other contexts, the component itself is considered required to satisfy the parent constraint.
  return false;
}
