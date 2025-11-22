//
// Copyright 2025 DXOS.org
//

import { type JsonSchemaType, toJsonSchema } from './internal/json-schema';

/**
 * Serializable JsonSchema type definition.
 */
export type JsonSchema = JsonSchemaType;

/**
 * Create a JsonSchema object from an Effect Schema object.
 */
export const make: typeof toJsonSchema = toJsonSchema;
