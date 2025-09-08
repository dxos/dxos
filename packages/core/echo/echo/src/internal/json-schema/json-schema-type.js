"use strict";
//
// Copyright 2024 DXOS.org
//
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedEchoAnnotations = exports.ECHO_ANNOTATIONS_NS_KEY = exports.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY = exports.setSchemaProperty = exports.getSchemaProperty = exports.JsonSchemaType = exports.JsonSchemaFields = exports.JsonSchemaEchoAnnotations = void 0;
var effect_1 = require("effect");
var effect_2 = require("@dxos/effect");
var ast_1 = require("../ast");
var formats_1 = require("../formats");
//
// JSON Schema
//
// TODO(burdon): Reuse/reconcile with ScalarTypeEnum (handle arrays).
var SimpleTypes = effect_1.Schema.Literal('array', 'boolean', 'integer', 'null', 'number', 'object', 'string');
var NonNegativeInteger = effect_1.Schema.Number.pipe(effect_1.Schema.greaterThanOrEqualTo(0));
var StringArray = effect_1.Schema.Array(effect_1.Schema.String).pipe(effect_1.Schema.mutable);
var JsonSchemaOrBoolean = effect_1.Schema.Union(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }), effect_1.Schema.Boolean);
/**
 * Go under the `annotations` property.
 */
exports.JsonSchemaEchoAnnotations = effect_1.Schema.Struct({
    /**
     * Label for this schema.
     * Mapped from {@link LabelAnnotationId}.
     */
    labelProp: effect_1.Schema.optional(effect_1.Schema.Union(effect_2.JsonPath, effect_1.Schema.Array(effect_2.JsonPath))),
    /**
     * Generator function for this schema.
     * Mapped from {@link GeneratorAnnotationId}.
     */
    generator: effect_1.Schema.optional(effect_1.Schema.Union(effect_1.Schema.String, effect_1.Schema.Tuple(effect_1.Schema.String, effect_1.Schema.Number))),
    /**
     * {@link PropertyMeta} annotations get serialized here.
     */
    meta: effect_1.Schema.optional(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.Any,
    }).pipe(effect_1.Schema.mutable)),
    /**
     * @deprecated
     */
    // TODO(dmaretskyi): We risk old schema not passing validation due to the extra fields. Remove when we are sure this is safe
    type: effect_1.Schema.optional(effect_1.Schema.Struct({
        typename: effect_1.Schema.String,
        version: effect_1.Schema.String,
        // Not used.
        schemaId: effect_1.Schema.optional(effect_1.Schema.String),
    }).pipe(effect_1.Schema.mutable)),
    /**
     * @deprecated Superseded by `meta`.
     */
    annotations: effect_1.Schema.optional(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.Any,
    }).pipe(effect_1.Schema.mutable)),
}).pipe(effect_1.Schema.mutable);
/**
 * Describes a schema for the JSON-schema objects stored in ECHO.
 * Contains extensions for ECHO (e.g., references).
 * Ref: https://json-schema.org/draft-07/schema
 */
// TODO(burdon): Integrate with Effect Serializable?
// TODO(dmaretskyi): Update to latest draft: https://json-schema.org/draft/2020-12
var _JsonSchemaType = effect_1.Schema.Struct({
    /**
     * Identifier for this schema.
     * This schema might be referenced by $ref clause in other schemas.
     */
    // TODO(dmaretskyi): Specify how the ids are generated.
    // TODO(dmaretskyi): For type dxns, should this include the version?
    $id: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Schema of this schema.
     * Set to "https://json-schema.org/draft-07/schema".
     */
    $schema: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Reference to another schema.
     */
    $ref: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Comments are ignored when interpreting the schema.
     */
    $comment: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Defines whether this schema is an object schema or a relation schema.
     */
    entityKind: effect_1.Schema.optional(ast_1.EntityKindSchema),
    /**
     * Typename of this schema.
     * Only on schema representing an ECHO object.
     *
     * @example 'example.com/type/MyType'
     */
    typename: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Version of this schema.
     * Custom dialect for ECHO.
     */
    version: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Target of this relation.
     * Only for relation schemas.
     * The referenced schema must be an object schema.
     */
    relationTarget: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    /**
     * Source of this relation.
     * Only for relation schemas.
     * The referenced schema must be an object schema.
     */
    relationSource: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    /**
     * Title of this schema.
     */
    title: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Description of this schema.
     */
    description: effect_1.Schema.optional(effect_1.Schema.String),
    /**
     * Whether this schema is read-only.
     */
    readOnly: effect_1.Schema.optional(effect_1.Schema.Boolean),
    /**
     * Whether this schema is write-only.
     */
    writeOnly: effect_1.Schema.optional(effect_1.Schema.Boolean),
    /**
     * Examples of instances of this schema.
     */
    examples: effect_1.Schema.optional(effect_1.Schema.Array(effect_1.Schema.Any)),
    /**
     * Default value for this schema.
     */
    default: effect_1.Schema.optional(effect_1.Schema.Any),
    /**
     * This schema only matches values that are equal to this value.
     */
    const: effect_1.Schema.optional(effect_1.Schema.Any),
    /**
     * This schema only matches one of the values in this array.
     */
    enum: effect_1.Schema.optional(effect_1.Schema.Array(effect_1.Schema.Any)),
    /**
     * Base type of the schema.
     */
    type: effect_1.Schema.optional(effect_1.Schema.Union(SimpleTypes, effect_1.Schema.Array(SimpleTypes))),
    //
    // Numbers.
    //
    multipleOf: effect_1.Schema.optional(effect_1.Schema.Number.pipe(effect_1.Schema.greaterThan(0))),
    maximum: effect_1.Schema.optional(effect_1.Schema.Number),
    exclusiveMaximum: effect_1.Schema.optional(effect_1.Schema.Number),
    minimum: effect_1.Schema.optional(effect_1.Schema.Number),
    exclusiveMinimum: effect_1.Schema.optional(effect_1.Schema.Number),
    //
    // Strings.
    //
    maxLength: effect_1.Schema.optional(NonNegativeInteger),
    /**
     * Regex pattern for strings.
     */
    pattern: effect_1.Schema.optional(effect_1.Schema.String.pipe(formats_1.FormatAnnotation.set(formats_1.FormatEnum.Regex))),
    /**
     * Serialized from {@link FormatAnnotationId}.
     */
    format: effect_1.Schema.optional(effect_1.Schema.String),
    //
    // Arrays
    //
    minLength: effect_1.Schema.optional(NonNegativeInteger),
    items: effect_1.Schema.optional(effect_1.Schema.Union(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }), effect_1.Schema.Array(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })))),
    additionalItems: effect_1.Schema.optional(effect_1.Schema.Union(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }), effect_1.Schema.Boolean)),
    maxItems: effect_1.Schema.optional(NonNegativeInteger),
    minItems: effect_1.Schema.optional(NonNegativeInteger),
    uniqueItems: effect_1.Schema.optional(effect_1.Schema.Boolean),
    contains: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    //
    // Objects
    //
    maxProperties: effect_1.Schema.optional(NonNegativeInteger),
    minProperties: effect_1.Schema.optional(NonNegativeInteger),
    required: effect_1.Schema.optional(StringArray),
    /**
     * Non-standard JSON Schema extension.
     * Defines the order of properties in the object.
     * The unmentioned properties are placed at the end.
     *
     * Related: https://github.com/json-schema/json-schema/issues/119
     */
    propertyOrder: effect_1.Schema.optional(StringArray),
    additionalProperties: effect_1.Schema.optional(JsonSchemaOrBoolean),
    properties: effect_1.Schema.optional(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }),
    }).pipe(effect_1.Schema.mutable)),
    patternProperties: effect_1.Schema.optional(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }),
    }).pipe(effect_1.Schema.mutable)),
    propertyNames: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    definitions: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }),
    }))),
    dependencies: effect_1.Schema.optional(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.suspend(function () { return effect_1.Schema.Union(effect_1.Schema.String, StringArray, exports.JsonSchemaType); }).annotations({
            identifier: 'dependency',
            description: 'Dependency',
        }),
    })),
    contentMediaType: effect_1.Schema.optional(effect_1.Schema.String),
    contentEncoding: effect_1.Schema.optional(effect_1.Schema.String),
    if: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    then: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    else: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    allOf: effect_1.Schema.optional(effect_1.Schema.Array(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }))),
    anyOf: effect_1.Schema.optional(effect_1.Schema.Array(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }))),
    oneOf: effect_1.Schema.optional(effect_1.Schema.Array(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }))),
    not: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return exports.JsonSchemaType; })),
    $defs: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Record({
        key: effect_1.Schema.String,
        value: effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }),
    }))),
    //
    // ECHO extensions.
    //
    currency: effect_1.Schema.optional(effect_1.Schema.String),
    reference: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Struct({
        schema: effect_1.Schema.suspend(function () { return exports.JsonSchemaType; }),
        schemaVersion: effect_1.Schema.optional(effect_1.Schema.String),
        schemaObject: effect_1.Schema.optional(effect_1.Schema.String),
    }))),
    /**
     * ECHO-specific annotations.
     */
    // TODO(dmaretskyi): Since we are adding a lot of new extensions to the JSON Schema, it is safer to namespace them here.
    annotations: effect_1.Schema.optional(effect_1.Schema.mutable(exports.JsonSchemaEchoAnnotations)),
    /**
     * @deprecated Use `annotations` instead.
     */
    echo: effect_1.Schema.optional(effect_1.Schema.mutable(exports.JsonSchemaEchoAnnotations)),
}).annotations({ identifier: 'jsonSchema', description: 'JSON Schema' });
exports.JsonSchemaFields = Object.keys(_JsonSchemaType.fields);
exports.JsonSchemaType = _JsonSchemaType.pipe(effect_1.Schema.mutable);
// TODO(burdon): Factor out JSON schema utils.
var getSchemaProperty = function (schema, property) {
    var _a;
    return (_a = schema.properties) === null || _a === void 0 ? void 0 : _a[property];
};
exports.getSchemaProperty = getSchemaProperty;
// TODO(burdon): Properties should be ordered.
var setSchemaProperty = function (schema, property, value) {
    var _a;
    (_a = schema.properties) !== null && _a !== void 0 ? _a : (schema.properties = {});
    schema.properties[property] = value;
    return schema;
};
exports.setSchemaProperty = setSchemaProperty;
/**
 * @internal
 */
exports.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY = 'echo';
/**
 * @internal
 */
exports.ECHO_ANNOTATIONS_NS_KEY = 'annotations';
/**
 * @internal
 * @returns ECHO annotations namespace object in its normalized form.
 *
 * `meta` holds PropertyMeta annotations.
 * `annotations` holds other annotations.
 */
var getNormalizedEchoAnnotations = function (obj) {
    if (obj[exports.ECHO_ANNOTATIONS_NS_KEY] != null && obj[exports.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY] != null) {
        return normalizeEchoAnnotations(__assign(__assign({}, obj[exports.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY]), obj[exports.ECHO_ANNOTATIONS_NS_KEY]));
    }
    else if (obj[exports.ECHO_ANNOTATIONS_NS_KEY] != null) {
        return normalizeEchoAnnotations(obj[exports.ECHO_ANNOTATIONS_NS_KEY]);
    }
    else if (obj[exports.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY] != null) {
        return normalizeEchoAnnotations(obj[exports.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY]);
    }
    else {
        return undefined;
    }
};
exports.getNormalizedEchoAnnotations = getNormalizedEchoAnnotations;
var normalizeEchoAnnotations = function (obj) {
    var _a;
    if (!obj.annotations) {
        return obj;
    }
    else {
        var res = __assign(__assign({}, obj), { meta: __assign(__assign({}, obj.annotations), ((_a = obj.meta) !== null && _a !== void 0 ? _a : {})) });
        delete res.annotations;
        return res;
    }
};
