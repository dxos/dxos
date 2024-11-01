//
// Copyright 2024 DXOS.org
//

import { Schema as S, type JSONSchema } from '@effect/schema';

export type JsonPath = string & { __JsonPath: true };

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * @example $.name
 */
export const JsonPath = S.String as S.Schema<JsonPath>;

// TODO(dmaretskyi): Define more precise types.
export type JsonSchemaType = JSONSchema.JsonSchema7;

/**
 * Type of the JSON schema stored in an ECHO object.
 */
export const JsonSchemaType = S.Any as S.Schema<JSONSchema.JsonSchema7>;
