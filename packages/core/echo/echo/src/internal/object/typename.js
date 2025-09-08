"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.getType = exports.setTypename = exports.getTypename = void 0;
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var ast_1 = require("../ast");
var accessors_1 = require("./accessors");
var model_1 = require("./model");
/**
 * Gets the typename of the object without the version.
 * Returns only the name portion, not the DXN.
 * @example "example.org/type/Contact"
 */
var getTypename = function (obj) {
    var _a;
    var schema = (0, accessors_1.getSchema)(obj);
    if (schema != null) {
        // Try to extract typename from DXN.
        return (0, ast_1.getSchemaTypename)(schema);
    }
    else {
        var type = (0, exports.getType)(obj);
        return (_a = type === null || type === void 0 ? void 0 : type.asTypeDXN()) === null || _a === void 0 ? void 0 : _a.type;
    }
};
exports.getTypename = getTypename;
/**
 * @internal
 */
// TODO(dmaretskyi): Rename setTypeDXN.
var setTypename = function (obj, typename) {
    (0, invariant_1.invariant)(typename instanceof keys_1.DXN, 'Invalid type.');
    Object.defineProperty(obj, model_1.TypeId, {
        value: typename,
        writable: false,
        enumerable: false,
        configurable: false,
    });
};
exports.setTypename = setTypename;
/**
 * @returns Object type as {@link DXN}.
 * @returns undefined if the object doesn't have a type.
 * @example `dxn:example.com/type/Contact:1.0.0`
 */
var getType = function (obj) {
    if (!obj) {
        return undefined;
    }
    var type = obj[model_1.TypeId];
    if (!type) {
        return undefined;
    }
    (0, invariant_1.invariant)(type instanceof keys_1.DXN, 'Invalid object.');
    return type;
};
exports.getType = getType;
