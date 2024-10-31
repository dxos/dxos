import { Schema as S, JSONSchema } from '@effect/schema';

// TODO(dmaretskyi): Define more precise type.

/**
 * Type of the JSON schema stored in an ECHO object.
 */
export const JsonSchemaType = S.Any as S.Schema<JSONSchema.JsonSchema7>;

export type JsonSchemaType = JSONSchema.JsonSchema7;
