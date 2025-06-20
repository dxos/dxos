//
// Copyright 2025 DXOS.org
//

import * as EchoSchema from '@dxos/echo-schema';

/**
 * @deprecated Use `Type.JsonSchema`.
 */
export const Type = EchoSchema.JsonSchemaType;
export type Type = EchoSchema.JsonSchemaType;

/**
 * @deprecated Use `Type.toJsonSchema`.
 */
export const toJsonSchema = EchoSchema.toJsonSchema;
export const toEffectSchema = EchoSchema.toEffectSchema;
