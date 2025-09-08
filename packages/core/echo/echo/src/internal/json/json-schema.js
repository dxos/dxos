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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEffectSchema = exports.toJsonSchema = exports.toPropType = exports.PropType = exports.createJsonSchema = void 0;
var effect_1 = require("effect");
var debug_1 = require("@dxos/debug");
var effect_2 = require("@dxos/effect");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var util_1 = require("@dxos/util");
var ast_1 = require("../ast");
var ast_2 = require("../ast");
var json_schema_1 = require("../json-schema");
var object_1 = require("../object");
var ref_1 = require("../ref");
var annotations_1 = require("./annotations");
/**
 * Create object jsonSchema.
 */
var createJsonSchema = function (schema) {
    if (schema === void 0) { schema = effect_1.Schema.Struct({}); }
    var jsonSchema = _toJsonSchema(schema);
    // TODO(dmaretskyi): Fix those in the serializer.
    jsonSchema.type = 'object';
    delete jsonSchema.anyOf;
    return jsonSchema;
};
exports.createJsonSchema = createJsonSchema;
// TODO(burdon): Are these values stored (can they be changed?)
var PropType;
(function (PropType) {
    PropType[PropType["NONE"] = 0] = "NONE";
    PropType[PropType["STRING"] = 1] = "STRING";
    PropType[PropType["NUMBER"] = 2] = "NUMBER";
    PropType[PropType["BOOLEAN"] = 3] = "BOOLEAN";
    PropType[PropType["DATE"] = 4] = "DATE";
    PropType[PropType["REF"] = 5] = "REF";
    PropType[PropType["RECORD"] = 6] = "RECORD";
    PropType[PropType["ENUM"] = 7] = "ENUM";
})(PropType || (exports.PropType = PropType = {}));
// TODO(burdon): Reconcile with @dxos/schema.
var toPropType = function (type) {
    switch (type) {
        case PropType.STRING:
            return 'string';
        case PropType.NUMBER:
            return 'number';
        case PropType.BOOLEAN:
            return 'boolean';
        case PropType.DATE:
            return 'date';
        case PropType.REF:
            return 'ref';
        case PropType.RECORD:
            return 'object';
        default:
            throw new Error("Invalid type: ".concat(type));
    }
};
exports.toPropType = toPropType;
var JSON_SCHEMA_URL = 'http://json-schema.org/draft-07/schema#';
/**
 * Convert effect schema to JSON Schema.
 * @param schema
 */
var toJsonSchema = function (schema, options) {
    if (options === void 0) { options = {}; }
    var jsonSchema = _toJsonSchema(schema);
    if (options.strict) {
        // TOOD(burdon): Workaround to ensure JSON schema is valid (for agv parsing).
        jsonSchema = (0, util_1.removeProperties)(jsonSchema, function (key, value) {
            if (key === '$id' && value === '/schemas/any') {
                return true;
            }
            if (key === '$ref' && value === '#/$defs/dependency') {
                return true;
            }
            if (key === '$ref' && value === '#/$defs/jsonSchema') {
                return true;
            }
            return false;
        });
    }
    return jsonSchema;
};
exports.toJsonSchema = toJsonSchema;
var _toJsonSchema = function (schema) {
    (0, invariant_1.invariant)(schema);
    var withRefinements = withEchoRefinements(schema.ast, '#');
    var jsonSchema = effect_1.JSONSchema.fromAST(withRefinements, {
        definitions: {},
    });
    jsonSchema.$schema = JSON_SCHEMA_URL;
    if (jsonSchema.properties && 'id' in jsonSchema.properties) {
        jsonSchema.properties = (0, util_1.orderKeys)(jsonSchema.properties, ['id']); // Put id first.
    }
    var echoIdentifier = (0, ast_1.getTypeIdentifierAnnotation)(schema);
    if (echoIdentifier) {
        jsonSchema.$id = echoIdentifier;
    }
    var objectAnnotation = (0, ast_1.getTypeAnnotation)(schema);
    if (objectAnnotation) {
        // EchoIdentifier annotation takes precedence but the id can also be defined by the typename.
        if (!jsonSchema.$id) {
            // TODO(dmaretskyi): Should this include the version?
            jsonSchema.$id = keys_1.DXN.fromTypename(objectAnnotation.typename).toString();
        }
        jsonSchema.entityKind = objectAnnotation.kind;
        jsonSchema.version = objectAnnotation.version;
        jsonSchema.typename = objectAnnotation.typename;
        if (jsonSchema.entityKind === ast_2.EntityKind.Relation) {
            jsonSchema.relationTarget = {
                $ref: objectAnnotation.sourceSchema,
            };
            jsonSchema.relationSource = {
                $ref: objectAnnotation.targetSchema,
            };
        }
    }
    // Fix field order.
    // TODO(dmaretskyi): Makes sure undefined is not left on optional fields for the resulting object.
    // TODO(dmaretskyi): `orderFields` util.
    jsonSchema = (0, util_1.orderKeys)(jsonSchema, [
        '$schema',
        '$id',
        'entityKind',
        'typename',
        'version',
        'relationTarget',
        'relationSource',
        'type',
        'enum',
        'properties',
        'required',
        'propertyOrder', // Custom.
        'items',
        'additionalProperties',
        'anyOf',
        'oneOf',
    ]);
    return jsonSchema;
};
var withEchoRefinements = function (ast, path, suspendCache) {
    var _a, _b;
    if (suspendCache === void 0) { suspendCache = new Map(); }
    if (path) {
        suspendCache.set(ast, path);
    }
    var recursiveResult;
    if (effect_1.SchemaAST.isSuspend(ast)) {
        // Precompute JSON schema for suspended AST since effect serializer does not support it.
        var suspendedAst_1 = ast.f();
        var cachedPath = suspendCache.get(suspendedAst_1);
        if (cachedPath) {
            recursiveResult = new effect_1.SchemaAST.Suspend(function () { return withEchoRefinements(suspendedAst_1, path, suspendCache); }, (_a = {},
                _a[effect_1.SchemaAST.JSONSchemaAnnotationId] = {
                    $ref: cachedPath,
                },
                _a));
        }
        else {
            var jsonSchema = _toJsonSchema(effect_1.Schema.make(suspendedAst_1));
            recursiveResult = new effect_1.SchemaAST.Suspend(function () { return withEchoRefinements(suspendedAst_1, path, suspendCache); }, (_b = {},
                _b[effect_1.SchemaAST.JSONSchemaAnnotationId] = jsonSchema,
                _b));
        }
    }
    else if (effect_1.SchemaAST.isTypeLiteral(ast)) {
        // Add property order annotations
        recursiveResult = (0, effect_2.mapAst)(ast, function (ast, key) {
            return withEchoRefinements(ast, path && typeof key === 'string' ? "".concat(path, "/").concat(key) : undefined, suspendCache);
        });
        recursiveResult = addJsonSchemaFields(recursiveResult, {
            propertyOrder: __spreadArray([], ast.propertySignatures.map(function (p) { return p.name; }), true),
        });
    }
    else if (effect_1.SchemaAST.isUndefinedKeyword(ast)) {
        // Ignore undefined keyword that appears in the optional fields.
        return ast;
    }
    else {
        recursiveResult = (0, effect_2.mapAst)(ast, function (ast, key) {
            return withEchoRefinements(ast, path && (typeof key === 'string' || typeof key === 'number') ? "".concat(path, "/").concat(key) : undefined, suspendCache);
        });
    }
    var annotationFields = annotations_toJsonSchemaFields(ast.annotations);
    if (Object.keys(annotationFields).length === 0) {
        return recursiveResult;
    }
    else {
        return addJsonSchemaFields(recursiveResult, annotationFields);
    }
};
/**
 * Convert JSON schema to effect schema.
 * @param root
 * @param definitions
 */
var toEffectSchema = function (root, _defs) {
    var defs = root.$defs ? __assign(__assign({}, _defs), root.$defs) : (_defs !== null && _defs !== void 0 ? _defs : {});
    if ('type' in root && root.type === 'object') {
        return objectToEffectSchema(root, defs);
    }
    var result = effect_1.Schema.Unknown;
    if ('$id' in root) {
        switch (root.$id) {
            case '/schemas/any': {
                result = anyToEffectSchema(root);
                break;
            }
            case '/schemas/unknown': {
                result = effect_1.Schema.Unknown;
                break;
            }
            case '/schemas/{}':
            case '/schemas/object': {
                result = effect_1.Schema.Object;
                break;
            }
            // Custom ECHO object reference.
            case '/schemas/echo/ref': {
                result = refToEffectSchema(root);
            }
        }
    }
    else if ('enum' in root) {
        result = effect_1.Schema.Union.apply(effect_1.Schema, root.enum.map(function (e) { return effect_1.Schema.Literal(e); }));
    }
    else if ('oneOf' in root) {
        result = effect_1.Schema.Union.apply(effect_1.Schema, root.oneOf.map(function (v) { return (0, exports.toEffectSchema)(v, defs); }));
    }
    else if ('anyOf' in root) {
        result = effect_1.Schema.Union.apply(effect_1.Schema, root.anyOf.map(function (v) { return (0, exports.toEffectSchema)(v, defs); }));
    }
    else if ('type' in root) {
        switch (root.type) {
            case 'string': {
                result = effect_1.Schema.String;
                if (root.pattern) {
                    result = result.pipe(effect_1.Schema.pattern(new RegExp(root.pattern)));
                }
                break;
            }
            case 'number': {
                result = effect_1.Schema.Number;
                break;
            }
            case 'integer': {
                result = effect_1.Schema.Number.pipe(effect_1.Schema.int());
                break;
            }
            case 'boolean': {
                result = effect_1.Schema.Boolean;
                break;
            }
            case 'array': {
                if (Array.isArray(root.items)) {
                    result = effect_1.Schema.Tuple.apply(effect_1.Schema, root.items.map(function (v) { return (0, exports.toEffectSchema)(v, defs); }));
                }
                else {
                    (0, invariant_1.invariant)(root.items);
                    var items = root.items;
                    result = Array.isArray(items)
                        ? effect_1.Schema.Tuple.apply(effect_1.Schema, items.map(function (v) { return (0, exports.toEffectSchema)(v, defs); })) : effect_1.Schema.Array((0, exports.toEffectSchema)(items, defs));
                }
                break;
            }
            case 'null': {
                result = effect_1.Schema.Null;
                break;
            }
        }
    }
    else if ('$ref' in root) {
        var refSegments = root.$ref.split('/');
        var jsonSchema = defs[refSegments[refSegments.length - 1]];
        (0, invariant_1.invariant)(jsonSchema, "missing definition for ".concat(root.$ref));
        result = (0, exports.toEffectSchema)(jsonSchema, defs).pipe(effect_1.Schema.annotations({ identifier: refSegments[refSegments.length - 1] }));
    }
    var annotations = jsonSchemaFieldsToAnnotations(root);
    // log.info('toEffectSchema', { root, annotations });
    result = result.annotations(annotations);
    return result;
};
exports.toEffectSchema = toEffectSchema;
var objectToEffectSchema = function (root, defs) {
    var _a, _b;
    (0, invariant_1.invariant)('type' in root && root.type === 'object', "not an object: ".concat(root));
    var echoRefinement = root[json_schema_1.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
    var isEchoObject = echoRefinement != null || ('$id' in root && typeof root.$id === 'string' && root.$id.startsWith('dxn:'));
    var fields = {};
    var propertyList = Object.entries((_a = root.properties) !== null && _a !== void 0 ? _a : {});
    var immutableIdField;
    for (var _i = 0, propertyList_1 = propertyList; _i < propertyList_1.length; _i++) {
        var _c = propertyList_1[_i], key = _c[0], value = _c[1];
        if (isEchoObject && key === 'id') {
            immutableIdField = (0, exports.toEffectSchema)(value, defs);
        }
        else {
            // TODO(burdon): Mutable cast.
            fields[key] = ((_b = root.required) === null || _b === void 0 ? void 0 : _b.includes(key))
                ? (0, exports.toEffectSchema)(value, defs)
                : effect_1.Schema.optional((0, exports.toEffectSchema)(value, defs));
        }
    }
    if (root.propertyOrder) {
        fields = (0, util_1.orderKeys)(fields, root.propertyOrder);
    }
    var schema;
    if (root.patternProperties) {
        (0, invariant_1.invariant)(propertyList.length === 0, 'pattern properties mixed with regular properties are not supported');
        (0, invariant_1.invariant)(Object.keys(root.patternProperties).length === 1 && Object.keys(root.patternProperties)[0] === '', 'only one pattern property is supported');
        schema = effect_1.Schema.Record({ key: effect_1.Schema.String, value: (0, exports.toEffectSchema)(root.patternProperties[''], defs) });
    }
    else if (typeof root.additionalProperties !== 'object') {
        schema = effect_1.Schema.Struct(fields);
    }
    else {
        var indexValue = (0, exports.toEffectSchema)(root.additionalProperties, defs);
        if (propertyList.length > 0) {
            schema = effect_1.Schema.Struct(fields, { key: effect_1.Schema.String, value: indexValue });
        }
        else {
            schema = effect_1.Schema.Record({ key: effect_1.Schema.String, value: indexValue });
        }
    }
    if (immutableIdField) {
        schema = effect_1.Schema.extend(effect_1.Schema.mutable(schema), effect_1.Schema.Struct({ id: immutableIdField }));
    }
    var annotations = jsonSchemaFieldsToAnnotations(root);
    return schema.annotations(annotations);
};
var anyToEffectSchema = function (root) {
    var echoRefinement = root[json_schema_1.ECHO_ANNOTATIONS_NS_DEPRECATED_KEY];
    // TODO(dmaretskyi): Is this branch still taken?
    if ((echoRefinement === null || echoRefinement === void 0 ? void 0 : echoRefinement.reference) != null) {
        var echoId = root.$id.startsWith('dxn:echo:') ? root.$id : undefined;
        return (0, ref_1.createEchoReferenceSchema)(echoId, echoRefinement.reference.typename, echoRefinement.reference.version);
    }
    return effect_1.Schema.Any;
};
// TODO(dmaretskyi): Types.
var refToEffectSchema = function (root) {
    if (!('reference' in root)) {
        return (0, ref_1.Ref)(object_1.Expando);
    }
    var reference = root.reference;
    if (typeof reference !== 'object') {
        throw new Error('Invalid reference field in ref schema');
    }
    var targetSchemaDXN = keys_1.DXN.parse(reference.schema.$ref);
    (0, invariant_1.invariant)(targetSchemaDXN.kind === keys_1.DXN.kind.TYPE);
    return (0, ref_1.createEchoReferenceSchema)(targetSchemaDXN.toString(), targetSchemaDXN.kind === keys_1.DXN.kind.TYPE ? targetSchemaDXN.parts[0] : undefined, reference.schemaVersion);
};
//
// Annotations
//
var annotations_toJsonSchemaFields = function (annotations) {
    var _a;
    var schemaFields = {};
    var echoAnnotations = {};
    for (var _i = 0, _b = Object.entries(annotations_1.EchoAnnotations); _i < _b.length; _i++) {
        var _c = _b[_i], key = _c[0], annotationId = _c[1];
        if (annotations[annotationId] != null) {
            echoAnnotations[key] = annotations[annotationId];
        }
    }
    if (Object.keys(echoAnnotations).length > 0) {
        // TODO(dmaretskyi): use new namespace.
        schemaFields[json_schema_1.ECHO_ANNOTATIONS_NS_KEY] = echoAnnotations;
    }
    var echoIdentifier = annotations[ast_1.TypeIdentifierAnnotationId];
    if (echoIdentifier) {
        (_a = schemaFields[json_schema_1.ECHO_ANNOTATIONS_NS_KEY]) !== null && _a !== void 0 ? _a : (schemaFields[json_schema_1.ECHO_ANNOTATIONS_NS_KEY] = {});
        schemaFields[json_schema_1.ECHO_ANNOTATIONS_NS_KEY].schemaId = echoIdentifier;
    }
    // Custom (at end).
    for (var _d = 0, _e = Object.entries(annotations_1.CustomAnnotations); _d < _e.length; _d++) {
        var _f = _e[_d], key = _f[0], annotationId = _f[1];
        var value = annotations[annotationId];
        if (value != null) {
            schemaFields[key] = value;
        }
    }
    return schemaFields;
};
var decodeTypeIdentifierAnnotation = function (schema) {
    var _a, _b, _c, _d;
    // Limit to dxn:echo: URIs.
    if (schema.$id && schema.$id.startsWith('dxn:echo:')) {
        return schema.$id;
    }
    else if (schema.$id && schema.$id.startsWith('dxn:type:') && ((_b = (_a = schema === null || schema === void 0 ? void 0 : schema.echo) === null || _a === void 0 ? void 0 : _a.type) === null || _b === void 0 ? void 0 : _b.schemaId)) {
        var id = (_d = (_c = schema === null || schema === void 0 ? void 0 : schema.echo) === null || _c === void 0 ? void 0 : _c.type) === null || _d === void 0 ? void 0 : _d.schemaId;
        if (keys_1.ObjectId.isValid(id)) {
            return keys_1.DXN.fromLocalObjectId(id).toString();
        }
    }
    return undefined;
};
var decodeTypeAnnotation = function (schema) {
    var _a, _b, _c, _d, _e, _f;
    if (schema.typename) {
        var annotation = {
            // TODO(dmaretskyi): Decoding default.
            kind: schema.entityKind ? effect_1.Schema.decodeSync(ast_2.EntityKindSchema)(schema.entityKind) : ast_2.EntityKind.Object,
            typename: schema.typename,
            version: (_a = schema.version) !== null && _a !== void 0 ? _a : '0.1.0',
        };
        if (annotation.kind === ast_2.EntityKind.Relation) {
            var source = (_c = (_b = schema.relationSource) === null || _b === void 0 ? void 0 : _b.$ref) !== null && _c !== void 0 ? _c : (0, debug_1.raise)(new Error('Relation source not set'));
            var target = (_e = (_d = schema.relationTarget) === null || _d === void 0 ? void 0 : _d.$ref) !== null && _e !== void 0 ? _e : (0, debug_1.raise)(new Error('Relation target not set'));
            annotation.sourceSchema = keys_1.DXN.parse(source).toString();
            annotation.targetSchema = keys_1.DXN.parse(target).toString();
        }
        return annotation;
    }
    // Decode legacy schema.
    if (!schema.typename && ((_f = schema === null || schema === void 0 ? void 0 : schema.echo) === null || _f === void 0 ? void 0 : _f.type)) {
        return {
            kind: ast_2.EntityKind.Object,
            typename: schema.echo.type.typename,
            version: schema.echo.type.version,
        };
    }
    return undefined;
};
var jsonSchemaFieldsToAnnotations = function (schema) {
    var _a;
    var annotations = {};
    var echoAnnotations = (_a = (0, json_schema_1.getNormalizedEchoAnnotations)(schema)) !== null && _a !== void 0 ? _a : {};
    if (echoAnnotations) {
        for (var _i = 0, _b = Object.entries(annotations_1.EchoAnnotations); _i < _b.length; _i++) {
            var _c = _b[_i], key = _c[0], annotationId = _c[1];
            if (echoAnnotations[key]) {
                annotations[annotationId] = echoAnnotations[key];
            }
        }
    }
    annotations[ast_1.TypeIdentifierAnnotationId] = decodeTypeIdentifierAnnotation(schema);
    annotations[ast_1.TypeAnnotationId] = decodeTypeAnnotation(schema);
    // Custom (at end).
    for (var _d = 0, _e = Object.entries(__assign(__assign({}, annotations_1.CustomAnnotations), annotations_1.DecodedAnnotations)); _d < _e.length; _d++) {
        var _f = _e[_d], key = _f[0], annotationId = _f[1];
        if (key in schema) {
            annotations[annotationId] = schema[key];
        }
    }
    return (0, util_1.clearUndefined)(annotations);
};
var makeAnnotatedRefinement = function (ast, annotations) {
    return new effect_1.SchemaAST.Refinement(ast, function () { return effect_1.Option.none(); }, annotations);
};
var addJsonSchemaFields = function (ast, schema) {
    var _a;
    return makeAnnotatedRefinement(ast, (_a = {}, _a[effect_1.SchemaAST.JSONSchemaAnnotationId] = schema, _a));
};
