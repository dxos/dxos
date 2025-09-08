"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareForeignKeys = exports.getMeta = exports.getObjectMeta = exports.foreignKeyEquals = exports.foreignKey = exports.ObjectMetaSchema = void 0;
var effect_1 = require("effect");
var echo_protocol_1 = require("@dxos/echo-protocol");
var invariant_1 = require("@dxos/invariant");
var util_1 = require("@dxos/util");
var model_1 = require("./model");
//
// ObjectMeta
//
// TODO(dmaretskyi): Rename to ObjectMeta
exports.ObjectMetaSchema = effect_1.Schema.Struct({
    keys: effect_1.Schema.mutable(effect_1.Schema.Array(echo_protocol_1.ForeignKey)),
});
var foreignKey = function (source, id) { return ({ source: source, id: id }); };
exports.foreignKey = foreignKey;
var foreignKeyEquals = function (a, b) { return a.source === b.source && a.id === b.id; };
exports.foreignKeyEquals = foreignKeyEquals;
/**
 * Get metadata from object.
 * Only callable on the object root.
 * @deprecated Use {@link getMeta}.
 */
// TODO(dmaretskyi): Remove.
var getObjectMeta = function (object) {
    return (0, exports.getMeta)(object);
};
exports.getObjectMeta = getObjectMeta;
/*
 * Get metadata from object.
 * Only callable on the object root.
 */
var getMeta = function (obj) {
    var metadata = obj[model_1.MetaId];
    (0, invariant_1.invariant)(metadata, 'ObjectMeta not found.');
    return metadata;
};
exports.getMeta = getMeta;
// TODO(dmaretskyi): Move to echo-schema.
var compareForeignKeys = function (a, b) {
    return (0, util_1.intersection)((0, exports.getMeta)(a).keys, (0, exports.getMeta)(b).keys, exports.foreignKeyEquals).length > 0;
};
exports.compareForeignKeys = compareForeignKeys;
