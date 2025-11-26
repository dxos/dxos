//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { JsonSchema } from '@dxos/echo';
import { type JsonPath, createJsonPath } from '@dxos/effect';

const TestSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.optional(Schema.Number),
  identities: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        type: Schema.Literal('email', 'phone', 'other'),
      }),
    ),
  ),
});

interface TestSchema extends Schema.Schema.Type<typeof TestSchema> {}

describe('json-schema', () => {
  /**
   * 1. The Effect AST is structural — not canonical.
   *    Effect’s Schema is primarily a combinator algebra.
   *    Each combinator wraps an AST node, but there is no normalization pass.
   * 2. Multiple semantically‐equivalent schemas → different ASTs.
   * 3. JSON Schema equivalence ≠ AST equivalence.
   */
  // test('JSON schema normalization', ({ expect: _expect }) => {
  //   const s1 = JSONSchema.make(TestSchema as any); // TODO(burdon): Fix cast.
  //   console.log(JSON.stringify(s1, null, 2));

  //   const s2 = JsonSchema.toJsonSchema(TestSchema);
  //   console.log(JSON.stringify(s2, null, 2));
  // });

  test('path', () => {
    const path = createJsonPath(['identities', 0, 'type']);
    console.log(path.toString());
  });

  test('encode/decode', ({ expect }) => {
    const jsonSchema = JsonSchema.toJsonSchema(TestSchema);

    // New property.
    addProperty({
      root: jsonSchema,
      path: createJsonPath([]),
      name: 'website',
      schema: JsonSchema.toJsonSchema(Schema.String),
      optional: false,
    });

    // New property.
    addProperty({
      root: jsonSchema,
      path: createJsonPath(['identities', 0]),
      name: 'value',
      schema: JsonSchema.toJsonSchema(
        Schema.Struct({
          data: Schema.String,
        }),
      ),
      optional: false,
    });

    // Traverse and collect paths.
    const paths: string[] = [];
    console.log('path'.padEnd(32), 'type'.padEnd(8), 'optional');
    traverseJsonSchema(jsonSchema, (schema, context) => {
      const pathString = context.path.toString();
      const typeString = String((schema as any).type ?? '');

      paths.push(pathString);
      console.log(pathString.padEnd(32), typeString.padEnd(8), isSchemaOptional(context));
    });

    // Root path is empty JsonPath.
    expect(paths).toContain('');
    // Direct properties on the root object.
    expect(paths).toContain('name');
    expect(paths).toContain('age');
    expect(paths).toContain('identities');
    // Nested properties through array items.
    expect(paths).toContain('identities[0].type');
    expect(paths).toContain('identities[0].value');

    // console.log(JSON.stringify(json, null, 2));
  });
});

export type SchemaContext = {
  parentSchema: JsonSchema.JsonSchema | null;
  propertyNameOrIndex: string | number | null;
  path: JsonPath;
};

/**
 * Visitor callback function executed for each sub-schema found during traversal.
 * @param schema The current sub-schema being visited.
 * @param context Information about the schema's position (parent, key/index, pointer).
 */
export type ContextualVisitorCallback = (schema: JsonSchema.JsonSchema, context: SchemaContext) => boolean | void;

/**
 * Recursive traversal.
 * https://github.com/sagold/json-schema-library
 */
export function traverseJsonSchema(
  schema: JsonSchema.JsonSchema,
  callback: ContextualVisitorCallback,
  segments: (string | number)[] = [],
  parentSchema: JsonSchema.JsonSchema | null = null,
  propertyNameOrIndex: string | number | null = null,
): void {
  const context: SchemaContext = {
    parentSchema,
    propertyNameOrIndex,
    path: createJsonPath(segments),
  };

  const result = callback(schema, context);
  if (result === false) {
    return;
  }

  // Check for Object properties.
  if (schema && typeof schema === 'object') {
    if (schema.properties && typeof schema.properties === 'object') {
      for (const key in schema.properties) {
        if (Object.prototype.hasOwnProperty.call(schema.properties, key)) {
          const subSchema = schema.properties[key];
          traverseJsonSchema(subSchema, callback, [...segments, key], schema, key);
        }
      }
    }
  }

  // Check for Array items (list or tuple validation).
  if (schema && typeof schema === 'object') {
    if (schema.items) {
      if (Array.isArray(schema.items)) {
        // Tuple validation.
        schema.items.forEach((itemSchema: JsonSchema.JsonSchema, index: number) => {
          traverseJsonSchema(itemSchema, callback, [...segments, index], schema, index);
        });
      } else {
        // List validation: use index 0 as canonical element path.
        const itemSchema = schema.items as JsonSchema.JsonSchema;
        traverseJsonSchema(itemSchema, callback, [...segments, 0], schema, 0);
      }
    }
  }

  // Handle complex logic (oneOf, anyOf, allOf) - These elements are typically always "required" in context.
  const combinators = ['oneOf', 'anyOf', 'allOf'] as const;
  for (const keyword of combinators) {
    const combinatorSchemas = schema[keyword];
    if (combinatorSchemas && Array.isArray(combinatorSchemas)) {
      combinatorSchemas.forEach((subSchema, index) => {
        traverseJsonSchema(subSchema, callback, segments, schema, index);
      });
    }
  }
}

/**
 * Determines if a schema is optional based on its parent's structure and constraints.
 * @param context The contextual information provided by the traverseJsonSchema function.
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

export type AddNewPropertyParams = {
  root: JsonSchema.JsonSchema;
  path: JsonPath;
  name: string;
  schema: JsonSchema.JsonSchema;
  optional: boolean;
};

/**
 * Finds a target object schema by its pointer and adds a new property definition.
 * @returns The modified rootSchema.
 */
export function addProperty({
  root,
  path,
  name,
  schema: schema,
  optional,
}: AddNewPropertyParams): JsonSchema.JsonSchema {
  const callback: ContextualVisitorCallback = (parent, context) => {
    // Check if the current schema is the target schema.
    if (context.path === path) {
      // Ensure the target schema is an object that can have properties.
      if (!(parent.type === 'object' && parent.properties)) {
        throw new Error(`Target schema is not a modifiable 'object' type: ${path}`);
      }

      // Add the new property definition.
      parent.properties[name] = schema;

      // Handle required status.
      if (!optional) {
        if (!parent.required) {
          parent.required = [];
        }

        if (!parent.required.includes(name)) {
          parent.required.push(name);
        }
      }

      return false;
    }
  };

  // Execute the traversal with the modification callback.
  traverseJsonSchema(root, callback);
  return root;
}
