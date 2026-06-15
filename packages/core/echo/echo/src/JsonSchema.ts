//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import * as jsonSchemaInternal from './internal/JsonSchema';

/**
 * Decode JSON Schema to Effect Schema.
 */
export const toEffectSchema = jsonSchemaInternal.toEffectSchema;

/**
 * Encode Effect Schema to JSON Schema.
 */
export const toJsonSchema = jsonSchemaInternal.toJsonSchema;

/**
 * Serializable JsonSchema type definition.
 */
export type JsonSchema = jsonSchemaInternal.JsonSchemaType;

export const JsonSchema: Schema.Schema<jsonSchemaInternal.JsonSchemaType> = jsonSchemaInternal.JsonSchemaType;
