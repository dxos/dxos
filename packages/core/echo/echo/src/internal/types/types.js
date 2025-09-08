"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInstanceOf = exports.requireTypeReference = exports.getTypeReference = exports.setValue = exports.getValue = exports.splitMeta = exports.RawObject = void 0;
var effect_1 = require("effect");
var echo_protocol_1 = require("@dxos/echo-protocol");
var effect_2 = require("@dxos/effect");
var keys_1 = require("@dxos/keys");
var util_1 = require("@dxos/util");
var ast_1 = require("../ast");
var object_1 = require("../object");
var model_1 = require("../object/model");
/**
 * The raw object should not include the ECHO id, but may include metadata.
 */
var RawObject = function (schema) {
    return effect_1.Schema.make(effect_1.SchemaAST.omit(schema.ast, ['id']));
};
exports.RawObject = RawObject;
//
// Utils
//
/**
 * Utility to split meta property from raw object.
 * @deprecated Bad API.
 */
var splitMeta = function (object) {
    var meta = object[model_1.ATTR_META];
    delete object[model_1.ATTR_META];
    return { meta: meta, object: object };
};
exports.splitMeta = splitMeta;
// TODO(burdon): Move to `@dxos/util`.
var getValue = function (obj, path) {
    return (0, util_1.getDeep)(obj, (0, effect_2.splitJsonPath)(path).map(function (p) { return p.replace(/[[\]]/g, ''); }));
};
exports.getValue = getValue;
// TODO(burdon): Move to `@dxos/util`.
var setValue = function (obj, path, value) {
    return (0, util_1.setDeep)(obj, (0, effect_2.splitJsonPath)(path).map(function (p) { return p.replace(/[[\]]/g, ''); }), value);
};
exports.setValue = setValue;
/**
 * Returns a reference that will be used to point to a schema.
 * @deprecated Use {@link getSchemaDXN} instead.
 */
var getTypeReference = function (schema) {
    if (!schema) {
        return undefined;
    }
    var schemaDXN = (0, ast_1.getSchemaDXN)(schema);
    if (!schemaDXN) {
        return undefined;
    }
    return echo_protocol_1.Reference.fromDXN(schemaDXN);
};
exports.getTypeReference = getTypeReference;
/**
 * Returns a reference that will be used to point to a schema.
 * @throws If it is not possible to reference this schema.
 *
 * @deprecated Use {@link getSchemaDXN} instead.
 */
var requireTypeReference = function (schema) {
    var typeReference = (0, exports.getTypeReference)(schema);
    if (typeReference == null) {
        // TODO(burdon): Catalog user-facing errors (this is too verbose).
        throw new Error('Schema must be defined via TypedObject.');
    }
    return typeReference;
};
exports.requireTypeReference = requireTypeReference;
// TODO(burdon): Can we use `Schema.is`?
/**
 * Checks if the object is an instance of the schema.
 * Only typename is compared, the schema version is ignored.
 *
 * The following cases are considered to mean that the object is an instance of the schema:
 *  - Object was created with this exact schema.
 *  - Object was created with a different version of this schema.
 *  - Object was created with a different schema (maybe dynamic) that has the same typename.
 */
var isInstanceOf = function (schema, object) {
    if (object == null) {
        return false;
    }
    var schemaDXN = (0, ast_1.getSchemaDXN)(schema);
    if (!schemaDXN) {
        throw new Error('Schema must have an object annotation.');
    }
    var type = (0, object_1.getType)(object);
    if (type && keys_1.DXN.equals(type, schemaDXN)) {
        return true;
    }
    var typename = (0, object_1.getTypename)(object);
    if (!typename) {
        return false;
    }
    var typeDXN = schemaDXN.asTypeDXN();
    if (!typeDXN) {
        return false;
    }
    return typeDXN.type === typename;
};
exports.isInstanceOf = isInstanceOf;
