"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineHiddenProperty = void 0;
/**
 * Define a non-enumerable property on an object.
 */
var defineHiddenProperty = function (object, key, value) {
    Object.defineProperty(object, key, {
        enumerable: false,
        configurable: true,
        value: value,
    });
};
exports.defineHiddenProperty = defineHiddenProperty;
