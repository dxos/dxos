//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Schema from 'effect/Schema';

import * as jsonSchemaInternal from './internal/JsonSchema/index.ts';

/**
 * Decode JSON Schema to Effect Schema.
 *
 * @performance O(schema size) rebuild on every call; cache the result rather than calling per use.
 */
export const toEffectSchema = jsonSchemaInternal.toEffectSchema;

/**
 * Encode Effect Schema to JSON Schema.
 *
 * @performance O(schema size) encode on every call.
 */
export const toJsonSchema = jsonSchemaInternal.toJsonSchema;

/**
 * Restores every `StructWithRest` signature Effect nests under `allOf` to its node's `additionalProperties`.
 *
 * @performance O(schema size) walk.
 */
export const foldRestSignatures = jsonSchemaInternal.foldRestSignatures;

/**
 * Serializable JsonSchema type definition.
 */
export type JsonSchema = jsonSchemaInternal.JsonSchemaType;

export const JsonSchema: Schema.Codec<jsonSchemaInternal.JsonSchemaType> = jsonSchemaInternal.JsonSchemaType;
