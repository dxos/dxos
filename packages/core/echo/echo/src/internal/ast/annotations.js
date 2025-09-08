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
exports.getSchemaDXN = exports.GeneratorAnnotation = exports.GeneratorAnnotationId = exports.FieldLookupAnnotationId = exports.LabelAnnotation = exports.LabelAnnotationId = exports.ViewAnnotation = exports.ViewAnnotationId = exports.SchemaMetaSymbol = exports.getReferenceAnnotation = exports.ReferenceAnnotationId = exports.getPropertyMetaAnnotation = exports.PropertyMeta = exports.PropertyMetaAnnotationId = exports.getSchemaVersion = exports.getSchemaTypename = exports.getEntityKind = exports.getTypeAnnotation = exports.TypeAnnotation = exports.Version = exports.Typename = exports.TypeAnnotationId = exports.getTypeIdentifierAnnotation = exports.TypeIdentifierAnnotationId = void 0;
var effect_1 = require("effect");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var annotation_helper_1 = require("./annotation-helper");
var entity_kind_1 = require("./entity-kind");
/**
 * ECHO identifier (for a stored schema).
 * Must be a `dxn:echo:` URI.
 */
exports.TypeIdentifierAnnotationId = Symbol.for('@dxos/schema/annotation/TypeIdentifier');
var getTypeIdentifierAnnotation = function (schema) {
    return (0, effect_1.flow)(effect_1.SchemaAST.getAnnotation(exports.TypeIdentifierAnnotationId), effect_1.Option.getOrElse(function () { return undefined; }))(schema.ast);
};
exports.getTypeIdentifierAnnotation = getTypeIdentifierAnnotation;
/**
 * ECHO type.
 */
exports.TypeAnnotationId = Symbol.for('@dxos/schema/annotation/Type');
// TODO(burdon): Create echo-schema Format types.
// TODO(burdon): Reconcile with "short" DXN.
exports.Typename = effect_1.Schema.String.pipe(effect_1.Schema.pattern(/^[a-zA-Z]\w+\.[a-zA-Z]\w{1,}\/[\w/_-]+$/));
exports.Version = effect_1.Schema.String.pipe(effect_1.Schema.pattern(/^\d+.\d+.\d+$/));
/**
 * Payload stored under {@link TypeAnnotationId}.
 */
// TODO(dmaretskyi): Rename getTypeAnnotation to represent commonality between objects and relations (e.g. `entity`).
exports.TypeAnnotation = effect_1.Schema.Struct({
    kind: effect_1.Schema.Enums(entity_kind_1.EntityKind),
    typename: exports.Typename,
    version: exports.Version,
    /**
     * If this is a relation, the schema of the source object.
     * Must be present if entity kind is {@link EntityKind.Relation}.
     */
    sourceSchema: effect_1.Schema.optional(keys_1.DXN.Schema),
    /**
     * If this is a relation, the schema of the target object.
     * Must be present if entity kind is {@link EntityKind.Relation}.
     */
    targetSchema: effect_1.Schema.optional(keys_1.DXN.Schema),
});
/**
 * @returns {@link TypeAnnotation} from a schema.
 * Schema must have been created with {@link TypedObject} or {@link TypedLink} or manually assigned an appropriate annotation.
 */
var getTypeAnnotation = function (schema) {
    (0, invariant_1.assertArgument)(schema != null && schema.ast != null, 'invalid schema');
    return (0, effect_1.flow)(effect_1.SchemaAST.getAnnotation(exports.TypeAnnotationId), effect_1.Option.getOrElse(function () { return undefined; }))(schema.ast);
};
exports.getTypeAnnotation = getTypeAnnotation;
/**
 * @returns {@link EntityKind} from a schema.
 */
var getEntityKind = function (schema) { var _a; return (_a = (0, exports.getTypeAnnotation)(schema)) === null || _a === void 0 ? void 0 : _a.kind; };
exports.getEntityKind = getEntityKind;
/**
 * @deprecated Use {@link Type.getTypename} instead.
 * @returns Schema typename (without dxn: prefix or version number).
 */
var getSchemaTypename = function (schema) { var _a; return (_a = (0, exports.getTypeAnnotation)(schema)) === null || _a === void 0 ? void 0 : _a.typename; };
exports.getSchemaTypename = getSchemaTypename;
/**
 * @deprecated Use {@link Type.getVersion} instead.
 * @returns Schema version in semver format.
 */
var getSchemaVersion = function (schema) { var _a; return (_a = (0, exports.getTypeAnnotation)(schema)) === null || _a === void 0 ? void 0 : _a.version; };
exports.getSchemaVersion = getSchemaVersion;
/**
 * PropertyMeta (metadata for dynamic schema properties).
 * For user-defined annotations.
 */
exports.PropertyMetaAnnotationId = Symbol.for('@dxos/schema/annotation/PropertyMeta');
var PropertyMeta = function (name, value) {
    return function (self) {
        var _a, _b;
        var existingMeta = self.ast.annotations[exports.PropertyMetaAnnotationId];
        return self.annotations((_a = {},
            _a[exports.PropertyMetaAnnotationId] = __assign(__assign({}, existingMeta), (_b = {}, _b[name] = value, _b)),
            _a));
    };
};
exports.PropertyMeta = PropertyMeta;
var getPropertyMetaAnnotation = function (prop, name) {
    return (0, effect_1.pipe)(effect_1.SchemaAST.getAnnotation(exports.PropertyMetaAnnotationId)(prop.type), effect_1.Option.map(function (meta) { return meta[name]; }), effect_1.Option.getOrElse(function () { return undefined; }));
};
exports.getPropertyMetaAnnotation = getPropertyMetaAnnotation;
/**
 * Schema reference.
 */
exports.ReferenceAnnotationId = Symbol.for('@dxos/schema/annotation/Reference');
var getReferenceAnnotation = function (schema) {
    return (0, effect_1.pipe)(effect_1.SchemaAST.getAnnotation(exports.ReferenceAnnotationId)(schema.ast), effect_1.Option.getOrElse(function () { return undefined; }));
};
exports.getReferenceAnnotation = getReferenceAnnotation;
/**
 * SchemaMeta.
 */
exports.SchemaMetaSymbol = Symbol.for('@dxos/schema/SchemaMeta');
/**
 * Identifies a schema as a view.
 */
exports.ViewAnnotationId = Symbol.for('@dxos/schema/annotation/View');
exports.ViewAnnotation = (0, annotation_helper_1.createAnnotationHelper)(exports.ViewAnnotationId);
/**
 * Identifies label property or JSON path expression.
 * Either a string or an array of strings representing field accessors each matched in priority order.
 */
exports.LabelAnnotationId = Symbol.for('@dxos/schema/annotation/Label');
exports.LabelAnnotation = (0, annotation_helper_1.createAnnotationHelper)(exports.LabelAnnotationId);
/**
 * Default field to be used on referenced schema to lookup the value.
 */
exports.FieldLookupAnnotationId = Symbol.for('@dxos/schema/annotation/FieldLookup');
/**
 * Generate test data.
 */
exports.GeneratorAnnotationId = Symbol.for('@dxos/schema/annotation/Generator');
exports.GeneratorAnnotation = (0, annotation_helper_1.createAnnotationHelper)(exports.GeneratorAnnotationId);
/**
 * @returns DXN of the schema.
 *
 * For non-stored schema returns `dxn:type:`.
 * For stored schema returns `dxn:echo:`.
 * @deprecated Use `Type.getDXN`.
 */
var getSchemaDXN = function (schema) {
    (0, invariant_1.assertArgument)(effect_1.Schema.isSchema(schema), 'invalid schema');
    var id = (0, exports.getTypeIdentifierAnnotation)(schema);
    if (id) {
        return keys_1.DXN.parse(id);
    }
    // TODO(dmaretskyi): Add support for dynamic schema.
    var objectAnnotation = (0, exports.getTypeAnnotation)(schema);
    if (!objectAnnotation) {
        return undefined;
    }
    return keys_1.DXN.fromTypenameAndVersion(objectAnnotation.typename, objectAnnotation.version);
};
exports.getSchemaDXN = getSchemaDXN;
