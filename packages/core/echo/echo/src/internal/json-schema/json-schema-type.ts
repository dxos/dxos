//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { JsonPath, type JsonProp } from '@dxos/effect';

import { FormatAnnotation, TypeFormat } from '../formats';
import { EntityKindSchema } from '../types';

//
// JSON Schema
//

// TODO(burdon): Reuse/reconcile with ScalarTypeEnum (handle arrays).
const SimpleTypes = Schema.Literal('array', 'boolean', 'integer', 'null', 'number', 'object', 'string');

const NonNegativeInteger = Schema.Number.pipe(Schema.greaterThanOrEqualTo(0));

const StringArray = Schema.Array(Schema.String).pipe(Schema.mutable);

const JsonSchemaOrBoolean = Schema.Union(
  Schema.suspend(() => JsonSchemaType),
  Schema.Boolean,
);

/**
 * Go under the `annotations` property.
 */
export const JsonSchemaEchoAnnotations = Schema.Struct({
  /**
   * Label for this schema.
   * Mapped from {@link LabelAnnotationId}.
   */
  labelProp: Schema.optional(Schema.Union(JsonPath, Schema.Array(JsonPath))),

  /**
   * Generator function for this schema.
   * Mapped from {@link GeneratorAnnotationId}.
   */
  generator: Schema.optional(Schema.Union(Schema.String, Schema.Tuple(Schema.String, Schema.Number))),

  /**
   * {@link PropertyMeta} annotations get serialized here.
   */
  meta: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Any,
    }).pipe(Schema.mutable),
  ),

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): We risk old schema not passing validation due to the extra fields. Remove when we are sure this is safe
  type: Schema.optional(
    Schema.Struct({
      typename: Schema.String,
      version: Schema.String,

      // Not used.
      schemaId: Schema.optional(Schema.String),
    }).pipe(Schema.mutable),
  ),

  /**
   * @deprecated Superseded by `meta`.
   */
  annotations: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Any,
    }).pipe(Schema.mutable),
  ),
}).pipe(Schema.mutable);
export type JsonSchemaEchoAnnotations = Schema.Schema.Type<typeof JsonSchemaEchoAnnotations>;

/**
 * Describes a schema for the JSON-schema objects stored in ECHO.
 * Contains extensions for ECHO (e.g., references).
 * Ref: https://json-schema.org/draft-07/schema
 */
// TODO(burdon): Integrate with Effect Serializable?
// TODO(dmaretskyi): Update to latest draft: https://json-schema.org/draft/2020-12
const _JsonSchemaType = Schema.Struct({
  /**
   * Identifier for this schema.
   * This schema might be referenced by $ref clause in other schemas.
   */
  // TODO(dmaretskyi): Specify how the ids are generated.
  // TODO(dmaretskyi): For type dxns, should this include the version?
  $id: Schema.optional(Schema.String),

  /**
   * Schema of this schema.
   * Set to "https://json-schema.org/draft-07/schema".
   */
  $schema: Schema.optional(Schema.String),

  /**
   * Reference to another schema.
   */
  $ref: Schema.optional(Schema.String),

  /**
   * Comments are ignored when interpreting the schema.
   */
  $comment: Schema.optional(Schema.String),

  /**
   * Defines whether this schema is an object schema or a relation schema.
   */
  entityKind: Schema.optional(EntityKindSchema),

  /**
   * Typename of this schema.
   * Only on schema representing an ECHO object.
   *
   * @example 'example.com/type/MyType'
   */
  typename: Schema.optional(Schema.String),

  /**
   * Version of this schema.
   * Custom dialect for ECHO.
   */
  version: Schema.optional(Schema.String),

  /**
   * Target of this relation.
   * Only for relation schemas.
   * The referenced schema must be an object schema.
   */
  relationTarget: Schema.optional(Schema.suspend(() => JsonSchemaType)),

  /**
   * Source of this relation.
   * Only for relation schemas.
   * The referenced schema must be an object schema.
   */
  relationSource: Schema.optional(Schema.suspend(() => JsonSchemaType)),

  /**
   * Title of this schema.
   */
  title: Schema.optional(Schema.String),

  /**
   * Description of this schema.
   */
  description: Schema.optional(Schema.String),

  /**
   * Whether this schema is read-only.
   */
  readOnly: Schema.optional(Schema.Boolean),

  /**
   * Whether this schema is write-only.
   */
  writeOnly: Schema.optional(Schema.Boolean),

  /**
   * Examples of instances of this schema.
   */
  examples: Schema.optional(Schema.Array(Schema.Any)),

  /**
   * Default value for this schema.
   */
  default: Schema.optional(Schema.Any),

  /**
   * This schema only matches values that are equal to this value.
   */
  const: Schema.optional(Schema.Any),

  /**
   * This schema only matches one of the values in this array.
   */
  enum: Schema.optional(Schema.Array(Schema.Any)),

  /**
   * Base type of the schema.
   */
  type: Schema.optional(Schema.Union(SimpleTypes, Schema.Array(SimpleTypes))),

  //
  // Numbers.
  //

  multipleOf: Schema.optional(Schema.Number.pipe(Schema.greaterThan(0))),
  maximum: Schema.optional(Schema.Number),
  exclusiveMaximum: Schema.optional(Schema.Number),
  minimum: Schema.optional(Schema.Number),
  exclusiveMinimum: Schema.optional(Schema.Number),

  //
  // Strings.
  //

  maxLength: Schema.optional(NonNegativeInteger),

  /**
   * Regex pattern for strings.
   */
  pattern: Schema.optional(Schema.String.pipe(FormatAnnotation.set(TypeFormat.Regex))),

  /**
   * Serialized from {@link FormatAnnotationId}.
   */
  format: Schema.optional(Schema.String),

  //
  // Arrays
  //

  minLength: Schema.optional(NonNegativeInteger),
  items: Schema.optional(
    Schema.Union(
      Schema.suspend(() => JsonSchemaType),
      Schema.Array(Schema.suspend(() => JsonSchemaType)),
    ),
  ),
  additionalItems: Schema.optional(
    Schema.Union(
      Schema.suspend(() => JsonSchemaType),
      Schema.Boolean,
    ),
  ),
  maxItems: Schema.optional(NonNegativeInteger),
  minItems: Schema.optional(NonNegativeInteger),
  uniqueItems: Schema.optional(Schema.Boolean),
  contains: Schema.optional(Schema.suspend(() => JsonSchemaType)),

  //
  // Objects
  //

  maxProperties: Schema.optional(NonNegativeInteger),
  minProperties: Schema.optional(NonNegativeInteger),
  required: Schema.optional(StringArray),

  /**
   * Non-standard JSON Schema extension.
   * Defines the order of properties in the object.
   * The unmentioned properties are placed at the end.
   *
   * Related: https://github.com/json-schema/json-schema/issues/119
   */
  propertyOrder: Schema.optional(StringArray),

  additionalProperties: Schema.optional(JsonSchemaOrBoolean),
  properties: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.suspend(() => JsonSchemaType),
    }).pipe(Schema.mutable),
  ),
  patternProperties: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.suspend(() => JsonSchemaType),
    }).pipe(Schema.mutable),
  ),
  propertyNames: Schema.optional(Schema.suspend(() => JsonSchemaType)),

  definitions: Schema.optional(
    Schema.mutable(
      Schema.Record({
        key: Schema.String,
        value: Schema.suspend(() => JsonSchemaType),
      }),
    ),
  ),
  dependencies: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.suspend(() => Schema.Union(Schema.String, StringArray, JsonSchemaType)).annotations({
        identifier: 'dependency',
        description: 'Dependency',
      }),
    }),
  ),

  contentMediaType: Schema.optional(Schema.String),
  contentEncoding: Schema.optional(Schema.String),

  if: Schema.optional(Schema.suspend(() => JsonSchemaType)),
  then: Schema.optional(Schema.suspend(() => JsonSchemaType)),
  else: Schema.optional(Schema.suspend(() => JsonSchemaType)),
  allOf: Schema.optional(Schema.Array(Schema.suspend(() => JsonSchemaType))),
  anyOf: Schema.optional(Schema.Array(Schema.suspend(() => JsonSchemaType))),
  oneOf: Schema.optional(Schema.Array(Schema.suspend(() => JsonSchemaType))),
  not: Schema.optional(Schema.suspend(() => JsonSchemaType)),
  $defs: Schema.optional(
    Schema.mutable(
      Schema.Record({
        key: Schema.String,
        value: Schema.suspend(() => JsonSchemaType),
      }),
    ),
  ),

  //
  // ECHO extensions.
  //

  currency: Schema.optional(Schema.String),

  reference: Schema.optional(
    Schema.mutable(
      Schema.Struct({
        schema: Schema.suspend(() => JsonSchemaType),
        schemaVersion: Schema.optional(Schema.String),
        schemaObject: Schema.optional(Schema.String),
      }),
    ),
  ),

  /**
   * ECHO-specific annotations.
   */
  // TODO(dmaretskyi): Since we are adding a lot of new extensions to the JSON Schema, it is safer to namespace them here.
  annotations: Schema.optional(Schema.mutable(JsonSchemaEchoAnnotations)),

  /**
   * @deprecated Use `annotations` instead.
   */
  echo: Schema.optional(Schema.mutable(JsonSchemaEchoAnnotations)),
}).annotations({ identifier: 'jsonSchema', description: 'JSON Schema' });

export const JsonSchemaFields = Object.keys(_JsonSchemaType.fields);

/**
 * https://json-schema.org/draft-07/schema
 */
export interface JsonSchemaType extends Schema.Schema.Type<Schema.mutable<typeof _JsonSchemaType>> {}

export const JsonSchemaType: Schema.Schema<JsonSchemaType> = _JsonSchemaType.pipe(Schema.mutable);

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
