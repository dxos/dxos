//
// Copyright 2024 DXOS.org
//

import { Schema as S, type JSONSchema } from '@effect/schema';

// Branded type.
export type JsonPath = string & { __JsonPath: true };

/**
 * https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * @example $.name
 */
// TODO(burdon): Pattern for error IDs (i.e., don't put user-facing messages in the annotation).
export const JsonPath = S.String.pipe(
  S.nonEmptyString({ message: () => 'Property is required.' }),
  S.pattern(/^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/, { message: () => 'Invalid property path.' }),
) as any as S.Schema<JsonPath>;

// TODO(dmaretskyi): Define more precise types.
export type JsonSchemaType = JSONSchema.JsonSchema7 & {
  // Fixing the existing types
  $id: string;

  //
  // Custom dialect
  //
  version: string;
  format?: string;
};

/**
 * Type of the JSON schema stored in an ECHO object.
 */
export const JsonSchemaType = S.Any as S.Schema<JSONSchema.JsonSchema7>;
