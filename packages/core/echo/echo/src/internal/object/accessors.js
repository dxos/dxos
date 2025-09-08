"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLabel = exports.getLabel = exports.getLabelForObject = exports.setSchema = exports.getSchema = exports.getObjectDXN = void 0;
var effect_1 = require("effect");
var effect_2 = require("@dxos/effect");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var util_1 = require("@dxos/util");
var ast_1 = require("../ast");
var model_1 = require("./model");
//
// Accessors based on model.
//
/**
 * Returns a DXN for an object or schema.
 * @deprecated Use `Obj.getDXN`.
 */
var getObjectDXN = function (object) {
    (0, invariant_1.invariant)(!effect_1.Schema.isSchema(object), 'schema not allowed in this function');
    (0, invariant_1.assertArgument)(typeof object === 'object' && object != null, 'expected object');
    (0, util_1.assumeType)(object);
    if (object[model_1.SelfDXNId]) {
        (0, invariant_1.invariant)(object[model_1.SelfDXNId] instanceof keys_1.DXN, 'Invalid object model: invalid self dxn');
        return object[model_1.SelfDXNId];
    }
    if (!keys_1.ObjectId.isValid(object.id)) {
        throw new TypeError('Object id is not valid.');
    }
    return keys_1.DXN.fromLocalObjectId(object.id);
};
exports.getObjectDXN = getObjectDXN;
/**
 * Returns the schema for the given object if one is defined.
 */
// TODO(burdon): Reconcile with `getTypename`.
// TODO(dmaretskyi): For echo objects, this always returns the root schema.
var getSchema = function (obj) {
    if (obj) {
        return obj[model_1.SchemaId];
    }
};
exports.getSchema = getSchema;
/**
 * Internal use only.
 */
var setSchema = function (obj, schema) {
    Object.defineProperty(obj, model_1.SchemaId, {
        value: schema,
        writable: false,
        enumerable: false,
        configurable: false,
    });
};
exports.setSchema = setSchema;
/**
 * @deprecated Use {@link Obj.getLabel} instead.
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
var getLabelForObject = function (obj) {
    var schema = (0, exports.getSchema)(obj);
    if (schema) {
        return (0, exports.getLabel)(schema, obj);
    }
};
exports.getLabelForObject = getLabelForObject;
/**
 * Returns the label for a given object based on {@link LabelAnnotationId}.
 */
// TODO(burdon): Convert to JsonPath?
var getLabel = function (schema, object) {
    var annotation = ast_1.LabelAnnotation.get(schema).pipe(effect_1.Option.getOrElse(function () { return ['name']; }));
    for (var _i = 0, annotation_1 = annotation; _i < annotation_1.length; _i++) {
        var accessor = annotation_1[_i];
        (0, invariant_1.assertArgument)(typeof accessor === 'string', 'Label annotation must be a string or an array of strings');
        var value = (0, effect_2.getField)(object, accessor);
        switch (typeof value) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'bigint':
            case 'symbol':
                return value.toString();
            case 'undefined':
            case 'object':
            case 'function':
                continue;
        }
    }
    return undefined;
};
exports.getLabel = getLabel;
/**
 * Sets the label for a given object based on {@link LabelAnnotationId}.
 */
var setLabel = function (schema, object, label) {
    var annotation = ast_1.LabelAnnotation.get(schema).pipe(effect_1.Option.map(function (field) { return field[0]; }), effect_1.Option.getOrElse(function () { return 'name'; }));
    object[annotation] = label;
};
exports.setLabel = setLabel;
