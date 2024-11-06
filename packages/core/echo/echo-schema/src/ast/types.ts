//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { PropertyMeta } from './annotations';
import { FormatAnnotationId } from '../formats';

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: string;
}

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
 * @internal
 */
// TODO(dmaretskyi): Document.
export const schemaVariance = {
  _A: (_: any) => _,
  _I: (_: any) => _,
  _R: (_: never) => _,
};

//
// JSON Schema
//

// TODO(burdon): Reuse/reconcile with ScalarTypeEnum.
const SimpleTypes = S.Literal('array', 'boolean', 'integer', 'null', 'number', 'object', 'string');

const SchemaArray = S.Array(S.suspend(() => JsonSchemaType));
const NonNegativeInteger = S.Number.pipe(S.greaterThanOrEqualTo(0));
const StringArray = S.Array(S.String);
const JsonSchemaOrBoolean = S.Union(
  S.suspend(() => JsonSchemaType),
  S.Boolean,
);

/**
 * Describes a schema for the JSON-schema objects stored in ECHO.
 * Contains extensions for ECHO (e.g., references).
 * Ref: https://json-schema.org/draft-07/schema
 */
// TODO(dmaretskyi): Fix circular types.
const JsonSchemaSchema = S.mutable(
  S.Struct({
    $id: S.optional(S.String),
    $schema: S.optional(S.String),
    $ref: S.optional(S.String),
    $comment: S.optional(S.String),
    title: S.optional(S.String),
    description: S.optional(S.String),
    default: S.optional(S.Any),
    version: S.optional(S.String),
    readOnly: S.optional(S.Boolean),
    writeOnly: S.optional(S.Boolean),
    examples: S.optional(S.Array(S.Any)),
    multipleOf: S.optional(S.Number.pipe(S.greaterThan(0))),
    maximum: S.optional(S.Number),
    exclusiveMaximum: S.optional(S.Number),
    minimum: S.optional(S.Number),
    exclusiveMinimum: S.optional(S.Number),
    maxLength: S.optional(NonNegativeInteger),
    minLength: S.optional(NonNegativeInteger),
    pattern: S.optional(S.String.annotations({ [FormatAnnotationId]: 'regex' })),
    additionalItems: S.optional(S.suspend(() => JsonSchemaType)),

    items: S.optional(S.suspend((): S.Schema.AnyNoContext => S.Union(JsonSchemaType, SchemaArray))),
    maxItems: S.optional(NonNegativeInteger),
    minItems: S.optional(NonNegativeInteger),
    uniqueItems: S.optional(S.Boolean),
    contains: S.optional(S.suspend(() => JsonSchemaType)),
    maxProperties: S.optional(NonNegativeInteger),
    minProperties: S.optional(NonNegativeInteger),
    required: S.optional(StringArray),
    additionalProperties: S.optional(JsonSchemaOrBoolean),
    definitions: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend((): S.Schema.AnyNoContext => JsonSchemaType),
        }),
      ),
    ),
    properties: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend((): S.Schema.AnyNoContext => JsonSchemaType),
        }),
      ),
    ),
    patternProperties: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend((): S.Schema.AnyNoContext => JsonSchemaType),
        }),
      ),
    ),
    dependencies: S.optional(
      S.Record({
        key: S.String,
        value: S.suspend((): S.Schema.AnyNoContext => S.Union(S.String, StringArray, JsonSchemaType)),
      }),
    ),
    propertyNames: S.optional(S.suspend(() => JsonSchemaType)),
    const: S.optional(S.Any),
    enum: S.optional(S.Array(S.Any)),
    type: S.optional(S.Union(SimpleTypes, S.Array(SimpleTypes))),
    format: S.optional(S.String),
    contentMediaType: S.optional(S.String),
    contentEncoding: S.optional(S.String),
    if: S.optional(S.suspend(() => JsonSchemaType)),
    then: S.optional(S.suspend(() => JsonSchemaType)),
    else: S.optional(S.suspend(() => JsonSchemaType)),
    allOf: S.optional(S.Array(S.suspend(() => JsonSchemaType))),
    anyOf: S.optional(S.Array(S.suspend(() => JsonSchemaType))),
    oneOf: S.optional(S.Array(S.suspend(() => JsonSchemaType))),
    not: S.optional(S.suspend(() => JsonSchemaType)),
    $defs: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend((): S.Schema.AnyNoContext => JsonSchemaType),
        }),
      ),
    ),

    //
    // ECHO extensions.
    //

    currency: S.optional(S.String),

    reference: S.optional(
      S.mutable(
        S.Struct({
          schema: S.suspend(() => JsonSchemaType),
          schemaVersion: S.optional(S.String),
          schemaObject: S.optional(S.String),
        }),
      ),
    ),

    // TODO(dmaretskyi): Remove echo namespace.
    echo: S.optional(
      S.mutable(
        S.Struct({
          type: S.optional(
            S.mutable(
              S.Struct({
                typename: S.String,
                version: S.String,
                schemaId: S.optional(S.String),
              }),
            ),
          ),
          annotations: S.optional(
            S.Record({
              key: S.String,
              value: S.Any,
            }),
          ),
        }),
      ),
    ),
  }),
);

/**
 * https://json-schema.org/draft-07/schema
 */
export interface JsonSchemaType extends S.Schema.Type<typeof JsonSchemaSchema> {}

export const JsonSchemaType: S.Schema<JsonSchemaType> = JsonSchemaSchema;
