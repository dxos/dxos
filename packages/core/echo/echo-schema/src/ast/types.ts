//
// Copyright 2024 DXOS.org
//

import { type JSONSchema } from '@effect/schema';

import { S } from '@dxos/effect';

import { PropertyMeta } from './annotations';

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

/**
 * @internal
 */
export const FIELD_PATH_ANNOTATION = 'path';

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
// TODO(burdon): Field, vs. path vs. property
export const FieldPath = (path: string) => PropertyMeta(FIELD_PATH_ANNOTATION, path);

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: string;
}

/**
 * https://json-schema.org/draft-07/schema
 */
// TODO(dmaretskyi): Use a flat type instead: https://json-schema.org/draft-07/schema#.
// TODO(burdon): Add typename.
export type JsonSchemaType = JSONSchema.JsonSchema7 & {
  // Fixing the existing types
  $id: string;
  version: string;
};

/**
 * Type of the JSON schema stored in an ECHO object.
 */
// TODO(dmaretskyi): Define effect schema for json schema.
export const JsonSchemaType = S.Any as S.Schema<JSONSchema.JsonSchema7Object>;

// TODO(burdon): Document.
export const schemaVariance = {
  _A: (_: any) => _,
  _I: (_: any) => _,
  _R: (_: never) => _,
};
