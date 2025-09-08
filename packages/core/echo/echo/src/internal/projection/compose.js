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
exports.composeSchema = void 0;
var invariant_1 = require("@dxos/invariant");
var schema_1 = require("../schema");
/**
 * Creates a composite schema from the source and projection schemas.
 */
// TODO(burdon): Use effect schema projections.
// TODO(burdon): Can avoid having to call this every time we modify any property on the view?
var composeSchema = function (source, target) {
    var _a, _b, _c, _d;
    var _e, _f, _g;
    var result = (0, schema_1.getSnapshot)(target);
    (0, invariant_1.invariant)('type' in result && result.type === 'object', 'source schema must be an object');
    (0, invariant_1.invariant)('type' in source && source.type === 'object', 'target schema must be an object');
    for (var prop in result.properties) {
        var propSchema = source.properties[prop]; // TODO(dmaretskyi): Find by json-path instead.
        var annotations = (_a = propSchema === null || propSchema === void 0 ? void 0 : propSchema.annotations) === null || _a === void 0 ? void 0 : _a.meta;
        if (annotations) {
            (_b = (_e = result.properties[prop]).annotations) !== null && _b !== void 0 ? _b : (_e.annotations = {});
            (_c = (_f = result.properties[prop].annotations).meta) !== null && _c !== void 0 ? _c : (_f.meta = {});
            for (var key in annotations) {
                (_d = (_g = result.properties[prop].annotations.meta)[key]) !== null && _d !== void 0 ? _d : (_g[key] = {});
                Object.assign(result.properties[prop].annotations.meta[key], annotations[key], __assign({}, result.properties[prop].annotations.meta[key]));
            }
        }
    }
    return result;
};
exports.composeSchema = composeSchema;
