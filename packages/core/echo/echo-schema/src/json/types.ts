//
// Copyright 2024 DXOS.org
//

import { Schema as S, type JSONSchema } from '@effect/schema';

// TODO(dmaretskyi): Define more precise type.

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * @example $.name
 */
export type JsonPath = string & { __JsonPath: true };

/**
 * Type of the JSON schema stored in an ECHO object.
 */
export const JsonSchemaType = S.Any as S.Schema<JSONSchema.JsonSchema7>;

export type JsonSchemaType = JSONSchema.JsonSchema7;
