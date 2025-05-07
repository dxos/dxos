//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { JsonPath, type JsonProp } from '@dxos/effect';

import { EntityKind } from './entity-kind';
import { FormatAnnotationId } from '../formats';

//
// JSON Schema
//

// TODO(burdon): Reuse/reconcile with ScalarTypeEnum (handle arrays).
const SimpleTypes = S.Literal('array', 'boolean', 'integer', 'null', 'number', 'object', 'string');

const NonNegativeInteger = S.Number.pipe(S.greaterThanOrEqualTo(0));
const StringArray = S.Array(S.String).pipe(S.mutable);
const JsonSchemaOrBoolean = S.Union(
  S.suspend(() => JsonSchemaType),
  S.Boolean,
);

export const EntityKindSchema = S.Enums(EntityKind);

export const JsonSchemaEchoAnnotations = S.Struct({
  /**
   * Label for this schema.
   * Mapped from {@link LabelAnnotationId}.
   */
  labelProp: S.optional(S.Union(JsonPath, S.Array(JsonPath))),

  /**
   * Generator function for this schema.
   * Mapped from {@link GeneratorAnnotationId}.
   */
  generator: S.optional(S.String),

  /**
   * {@link PropertyMeta} annotations get serialized here.
   */
  meta: S.optional(
    S.Record({
      key: S.String,
      value: S.Any,
    }).pipe(S.mutable),
  ),

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): We risk old schema not passing validation due to the extra fields. Remove when we are sure this is safe
  type: S.optional(
    S.Struct({
      typename: S.String,
      version: S.String,

      // Not used.
      schemaId: S.optional(S.String),
    }).pipe(S.mutable),
  ),

  /**
   * @deprecated Superseded by `meta`.
   */
  annotations: S.optional(
    S.Record({
      key: S.String,
      value: S.Any,
    }).pipe(S.mutable),
  ),
}).pipe(S.mutable);
export type JsonSchemaEchoAnnotations = S.Schema.Type<typeof JsonSchemaEchoAnnotations>;

/**
 * Describes a schema for the JSON-schema objects stored in ECHO.
 * Contains extensions for ECHO (e.g., references).
 * Ref: https://json-schema.org/draft-07/schema
 */
// TODO(burdon): Integrate with Effect Serializable?
// TODO(dmaretskyi): Update to latest draft: https://json-schema.org/draft/2020-12
const _JsonSchemaType = S.Struct({
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
   * Defines whether this schema is an object schema or a relation schema.
   */
  entityKind: S.optional(EntityKindSchema),

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
  items: S.optional(
    S.Union(
      S.suspend(() => JsonSchemaType),
      S.Array(S.suspend(() => JsonSchemaType)),
    ),
  ),
  additionalItems: S.optional(
    S.Union(
      S.suspend(() => JsonSchemaType),
      S.Boolean,
    ),
  ),
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

  /**
   * Non-standard JSON Schema extension.
   * Defines the order of properties in the object.
   * The unmentioned properties are placed at the end.
   *
   * Related: https://github.com/json-schema/json-schema/issues/119
   */
  propertyOrder: S.optional(StringArray),

  additionalProperties: S.optional(JsonSchemaOrBoolean),
  properties: S.optional(
    S.Record({
      key: S.String,
      value: S.suspend(() => JsonSchemaType),
    }).pipe(S.mutable),
  ),
  patternProperties: S.optional(
    S.Record({
      key: S.String,
      value: S.suspend(() => JsonSchemaType),
    }).pipe(S.mutable),
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
      value: S.suspend(() => S.Union(S.String, StringArray, JsonSchemaType)).annotations({
        identifier: 'dependency',
        description: 'Dependency',
      }),
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

  /**
   * ECHO-specific annotations.
   */
  // TODO(dmaretskyi): Since we are adding a lot of new extensions to the JSON Schema, it is safer to namespace them here.
  annotations: S.optional(S.mutable(JsonSchemaEchoAnnotations)),

  /**
   * @deprecated Use `annotations` instead.
   */
  echo: S.optional(S.mutable(JsonSchemaEchoAnnotations)),
}).annotations({ identifier: 'jsonSchema', description: 'JSON Schema' });

export const JsonSchemaFields = Object.keys(_JsonSchemaType.fields);

/**
 * https://json-schema.org/draft-07/schema
 */
export interface JsonSchemaType extends S.Schema.Type<S.mutable<typeof _JsonSchemaType>> {}

export const JsonSchemaType: S.Schema<JsonSchemaType> = _JsonSchemaType.pipe(S.mutable);

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

/**
 * @internal
 */
export const ECHO_ANNOTATIONS_NS_DEPRECATED_KEY: keyof JsonSchemaType = 'echo';

/**
 * @internal
 */
export const ECHO_ANNOTATIONS_NS_KEY = 'annotations';

/**
 * @internal
 * @returns ECHO annotations namespace object in its normalized form.
 *
 * `meta` holds PropertyMeta annotations.
 * `annotations` holds other annotations.
 */
export const getNormalizedEchoAnnotations = (obj: JsonSchemaType): JsonSchemaEchoAnnotations | undefined => {
  if (obj[ECHO_ANNOTATIONS_NS_KEY] != null && obj[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY] != null) {
    return normalizeEchoAnnotations({
      ...obj[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY],
      ...obj[ECHO_ANNOTATIONS_NS_KEY],
    });
  } else if (obj[ECHO_ANNOTATIONS_NS_KEY] != null) {
    return normalizeEchoAnnotations(obj[ECHO_ANNOTATIONS_NS_KEY]!);
  } else if (obj[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY] != null) {
    return normalizeEchoAnnotations(obj[ECHO_ANNOTATIONS_NS_DEPRECATED_KEY]!);
  } else {
    return undefined;
  }
};

const normalizeEchoAnnotations = (obj: JsonSchemaEchoAnnotations): JsonSchemaEchoAnnotations => {
  if (!obj.annotations) {
    return obj;
  } else {
    const res = {
      ...obj,
      meta: {
        ...obj.annotations,
        ...(obj.meta ?? {}),
      },
    };
    delete res.annotations;
    return res;
  }
};
