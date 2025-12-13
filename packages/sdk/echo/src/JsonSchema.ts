//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { JsonSchemaType } from './internal';

export { toEffectSchema, toJsonSchema } from './internal';

/**
 * Serializable JsonSchema type definition.
 */
export type JsonSchema = JsonSchemaType;

export const JsonSchema: Schema.Schema<JsonSchemaType> = JsonSchemaType;
