//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { JsonSchema } from '@dxos/echo';

/**
 * Minimal shape of a JSON Schema object as accepted by providers.
 * Deliberately loose so that callers do not need to satisfy the full
 * `JsonSchemaType` literal-union constraints at the call site.
 */
export type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
};

/**
 * Merge an array of JSON Schema objects into one by unioning their
 * `properties` maps (first definition wins on key conflict).
 */
export const mergeJsonSchemas = (schemas: (JsonSchemaObject | undefined)[]): JsonSchemaObject => {
  const properties: Record<string, unknown> = {};

  for (const schema of schemas) {
    if (schema?.properties == null) {
      continue;
    }
    for (const [key, value] of Object.entries(schema.properties)) {
      if (!(key in properties)) {
        properties[key] = value;
      }
    }
  }

  return { type: 'object', properties };
};

/**
 * Convert a merged `JsonSchemaObject` into an Effect Schema by first
 * validating and narrowing the plain object via `Schema.decodeUnknownSync`
 * (which accepts `unknown` input and produces the correctly-typed
 * `JsonSchemaType`) and then passing that to `toEffectSchema`.
 *
 * No type-assertion casts are used: `decodeUnknownSync` is the typed
 * boundary that converts the loose provider-supplied plain object into the
 * authoritative `JsonSchemaType`.
 */
export const buildUnionFormSchema = (schemas: (JsonSchemaObject | undefined)[]): Schema.Schema.AnyNoContext => {
  const merged = mergeJsonSchemas(schemas);
  const typed = Schema.decodeUnknownSync(JsonSchema.JsonSchema)(merged);
  return JsonSchema.toEffectSchema(typed);
};
