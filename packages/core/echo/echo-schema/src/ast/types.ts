//
// Copyright 2024 DXOS.org
//

import { type JsonProp, S } from '@dxos/effect';

import { PropertyMeta } from './annotations';
import { FormatAnnotationId } from '../formats';

/**
 * Marker interface for object with an `id`.
 */
export interface HasId {
  readonly id: string;
}

/**
 * @internal
 */
export const FIELD_PATH_ANNOTATION = 'path';

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
// TODO(burdon): Field, vs. path vs. property.
export const FieldPath = (path: string) => PropertyMeta(FIELD_PATH_ANNOTATION, path);

/**
 * @internal
 */
// TODO(burdon): Comment required.
export const schemaVariance = {
  _A: (_: any) => _,
  _I: (_: any) => _,
  _R: (_: never) => _,
};

//
// JSON Schema
//

// TODO(burdon): Reuse/reconcile with ScalarTypeEnum (handle arrays).
const SimpleTypes = S.Literal('array', 'boolean', 'integer', 'null', 'number', 'object', 'string');

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
const _JsonSchemaType = S.mutable(
  S.Struct({
    /**
     * Identifier for this schema.
     * This schema might be referenced by $ref clause in other schemas.
     */
    $id: S.optional(S.String),

    /**
     * Schema of this schema.
     * Set to "https://json-schema.org/draft-07/schema".
     */
    $schema: S.optional(S.String),

    /**
     * Reference to another schema.
     */
    $ref: S.optional(S.String),

    /**
     * Comments are ignored when interpreting the schema.
     */
    $comment: S.optional(S.String),

    /**
     * Typename of this schema.
     * Only on schema representing an ECHO object.
     *
     * @example 'example.com/type/MyType'
     */
    typename: S.optional(S.String),

    /**
     * Version of this schema.
     * Custom dialect for ECHO.
     */
    version: S.optional(S.String),

    title: S.optional(S.String),
    description: S.optional(S.String),

    readOnly: S.optional(S.Boolean),
    writeOnly: S.optional(S.Boolean),

    examples: S.optional(S.Array(S.Any)),

    /**
     * Default value for this schema.
     */
    default: S.optional(S.Any),

    const: S.optional(S.Any),
    enum: S.optional(S.Array(S.Any)),

    /**
     * Base type of the schema.
     */
    type: S.optional(S.Union(SimpleTypes, S.Array(SimpleTypes))),

    //
    // Numbers.
    //

    multipleOf: S.optional(S.Number.pipe(S.greaterThan(0))),
    maximum: S.optional(S.Number),
    exclusiveMaximum: S.optional(S.Number),
    minimum: S.optional(S.Number),
    exclusiveMinimum: S.optional(S.Number),

    //
    // Strings.
    //

    maxLength: S.optional(NonNegativeInteger),

    /**
     * Regex pattern for strings.
     */
    pattern: S.optional(S.String.annotations({ [FormatAnnotationId]: 'regex' })),

    /**
     * Serialized from {@link FormatAnnotationId}.
     */
    format: S.optional(S.String),

    //
    // Arrays
    //

    minLength: S.optional(NonNegativeInteger),
    items: S.optional(S.suspend(() => JsonSchemaType)),
    additionalItems: S.optional(S.suspend(() => JsonSchemaType)),
    maxItems: S.optional(NonNegativeInteger),
    minItems: S.optional(NonNegativeInteger),
    uniqueItems: S.optional(S.Boolean),
    contains: S.optional(S.suspend(() => JsonSchemaType)),

    //
    // Objects
    //

    maxProperties: S.optional(NonNegativeInteger),
    minProperties: S.optional(NonNegativeInteger),
    required: S.optional(StringArray),
    additionalProperties: S.optional(JsonSchemaOrBoolean),
    properties: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend(() => JsonSchemaType),
        }),
      ),
    ),
    patternProperties: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend(() => JsonSchemaType),
        }),
      ),
    ),
    propertyNames: S.optional(S.suspend(() => JsonSchemaType)),

    definitions: S.optional(
      S.mutable(
        S.Record({
          key: S.String,
          value: S.suspend(() => JsonSchemaType),
        }),
      ),
    ),
    dependencies: S.optional(
      S.Record({
        key: S.String,
        value: S.suspend(() => S.Union(S.String, StringArray, JsonSchemaType)),
      }),
    ),

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
          value: S.suspend(() => JsonSchemaType),
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
    /**
     * @deprecated
     */
    echo: S.optional(
      S.mutable(
        S.Struct({
          type: S.optional(
            S.mutable(
              S.Struct({
                typename: S.String,
                version: S.String,

                // Note: schemaId is the id of the echo object containing the schema.
                // This is why this annotation cannot be removed
                schemaId: S.optional(S.String),
              }),
            ),
          ),

          /**
           * {@link PropertyMeta} annotations get serialized here.
           */
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
export interface JsonSchemaType extends S.Schema.Type<typeof _JsonSchemaType> {}

export const JsonSchemaType: S.Schema<JsonSchemaType> = _JsonSchemaType;

// TODO(burdon): Factor out JSON schema utils.

export const getSchemaProperty = (schema: JsonSchemaType, property: JsonProp): JsonSchemaType | undefined => {
  return schema.properties?.[property];
};

// TODO(burdon): Properties should be ordered.
export const setSchemaProperty = (schema: JsonSchemaType, property: JsonProp, value: JsonSchemaType) => {
  schema.properties ??= {};
  schema.properties[property] = value;
  return schema;
};
