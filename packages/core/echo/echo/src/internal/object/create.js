"use strict";
//
// Copyright 2025 DXOS.org
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
exports.create = void 0;
var debug_1 = require("@dxos/debug");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var ast_1 = require("../ast");
var define_hidden_property_1 = require("../../../../live-object/src/define-hidden-property");
var accessors_1 = require("./accessors");
var inspect_1 = require("./inspect");
var json_serializer_1 = require("./json-serializer");
var model_1 = require("./model");
var typename_1 = require("./typename");
/**
 * Creates a new object instance from a schema and data, without signal reactivity.
 * This static version creates plain JavaScript objects that are not reactive/observable.
 * For reactive objects that automatically update UI when changed, use the regular live() function.
 *
 * @param schema - The Effect schema that defines the object's structure and type, piped into EchoObject
 * @param data - The data to initialize the object with. The id and @type fields are handled automatically.
 * @returns A new non-reactive object instance conforming to the schema
 * @throws {Error} If the schema is not an object schema
 * @throws {TypeError} If data contains an @type field
 *
 * @example
 * ```ts
 * const Contact = Schema.Struct({
 *   name: Schema.String,
 *   email: Schema.String,
 * }).pipe(Type.Obj({
 *   typename: 'example.com/type/Contact',
 *   version: '0.1.0',
 * }))
 *
 * // Creates a non-reactive contact object
 * const contact = create(Contact, {
 *   name: "John",
 *   email: "john@example.com",
 * })
 * ```
 */
// TODO(burdon): Rename make.
// TODO(burdon): Handle defaults (see Schema.make).
// TODO(dmaretskyi): Use `Obj.make` and `Relation.make` from '@dxos/echo' instead.
var create = function (schema, data) {
    var _a, _b, _c, _d;
    var annotation = (0, ast_1.getTypeAnnotation)(schema);
    if (!annotation) {
        throw new Error('Schema is not an object schema');
    }
    (0, invariant_1.assertArgument)(!('@type' in data), '@type is not allowed');
    (0, invariant_1.assertArgument)(!(model_1.RelationSourceDXNId in data), 'Relation source DXN is not allowed in the constructor');
    (0, invariant_1.assertArgument)(!(model_1.RelationTargetDXNId in data), 'Relation target DXN is not allowed in the constructor');
    (0, invariant_1.assertArgument)(model_1.RelationSourceId in data === model_1.RelationTargetId in data, 'Relation source and target must be provided together');
    var obj = __assign(__assign({}, data), { id: (_a = data.id) !== null && _a !== void 0 ? _a : keys_1.ObjectId.random() });
    var kind = model_1.RelationSourceId in data ? ast_1.EntityKind.Relation : ast_1.EntityKind.Object;
    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.EntityKindId, kind);
    (0, typename_1.setTypename)(obj, (_b = (0, ast_1.getSchemaDXN)(schema)) !== null && _b !== void 0 ? _b : (0, invariant_1.failedInvariant)('Missing schema DXN'));
    (0, accessors_1.setSchema)(obj, schema);
    (0, json_serializer_1.attachTypedJsonSerializer)(obj);
    (0, inspect_1.attachedTypedObjectInspector)(obj);
    (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.MetaId, { keys: [] });
    if (kind === ast_1.EntityKind.Relation) {
        var sourceDXN = (_c = (0, accessors_1.getObjectDXN)(data[model_1.RelationSourceId])) !== null && _c !== void 0 ? _c : (0, debug_1.raise)(new Error('Unresolved relation source'));
        var targetDXN = (_d = (0, accessors_1.getObjectDXN)(data[model_1.RelationTargetId])) !== null && _d !== void 0 ? _d : (0, debug_1.raise)(new Error('Unresolved relation target'));
        (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.RelationSourceDXNId, sourceDXN);
        (0, define_hidden_property_1.defineHiddenProperty)(obj, model_1.RelationTargetDXNId, targetDXN);
    }
    (0, model_1.assertObjectModelShape)(obj);
    return obj;
};
exports.create = create;
