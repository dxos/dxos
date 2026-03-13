//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import * as internal from './internal';

/**
 * Decode JSON Schema to Effect Schema.
 */
export const toEffectSchema = internal.toEffectSchema;

/**
 * Encode Effect Schema to JSON Schema.
 */
export const toJsonSchema = internal.toJsonSchema;

/**
 * Serializable JsonSchema type definition.
 */
export type JsonSchema = internal.JsonSchemaType;

export const JsonSchema: Schema.Schema<internal.JsonSchemaType> = internal.JsonSchemaType;
