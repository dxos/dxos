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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachedTypedObjectInspector = void 0;
var debug_1 = require("@dxos/debug");
var model_1 = require("./model");
var typename_1 = require("./typename");
/*
 * @internal
 */
var attachedTypedObjectInspector = function (obj) {
    var descriptor = Object.getOwnPropertyDescriptor(obj, debug_1.inspectCustom);
    if (descriptor) {
        return;
    }
    Object.defineProperty(obj, debug_1.inspectCustom, {
        value: typedObjectInspectFunction,
        writable: false,
        enumerable: false,
        configurable: true,
    });
};
exports.attachedTypedObjectInspector = attachedTypedObjectInspector;
// NOTE: KEEP as function.
var typedObjectInspectFunction = function (depth, options, inspect) {
    var _a, _b;
    var _c = this, id = _c.id, props = __rest(_c, ["id"]);
    return inspect(__assign(__assign((_a = { id: id }, _a[model_1.ATTR_TYPE] = (0, typename_1.getType)(this), _a), props), (_b = {}, _b[model_1.ATTR_META] = this[model_1.MetaId], _b)), options);
};
