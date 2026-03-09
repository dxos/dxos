//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import * as internal from './internal';

export const toEffectSchema = internal.toEffectSchema;
export const toJsonSchema = internal.toJsonSchema;

/**
 * Serializable JsonSchema type definition.
 */
export type JsonSchema = internal.JsonSchemaType;

export const JsonSchema: Schema.Schema<internal.JsonSchemaType> = internal.JsonSchemaType;
