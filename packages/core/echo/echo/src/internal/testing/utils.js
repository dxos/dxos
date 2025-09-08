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
exports.prepareAstForCompare = exports.updateCounter = void 0;
var signals_core_1 = require("@preact/signals-core");
var echo_signals_1 = require("@dxos/echo-signals");
var util_1 = require("@dxos/util");
(0, echo_signals_1.registerSignalsRuntime)();
// TODO(burdon): Move to util.
var updateCounter = function (touch) {
    var _a;
    var updateCount = -1;
    var unsubscribe = (0, signals_core_1.effect)(function () {
        touch();
        updateCount++;
    });
    return _a = {},
        // https://github.com/tc39/proposal-explicit-resource-management
        _a[Symbol.dispose] = unsubscribe,
        Object.defineProperty(_a, "count", {
            get: function () {
                return updateCount;
            },
            enumerable: false,
            configurable: true
        }),
        _a;
};
exports.updateCounter = updateCounter;
/**
 * Converts AST to a format that can be compared with test matchers.
 */
var prepareAstForCompare = function (obj) {
    return (0, util_1.deepMapValues)(obj, function (value, recurse, key) {
        if (typeof value === 'function') {
            return null;
        }
        if (value instanceof RegExp) {
            return value;
        }
        // Convert symbols to strings.
        if (typeof value === 'object') {
            var clone = __assign({}, value);
            for (var _i = 0, _a = Object.getOwnPropertySymbols(clone); _i < _a.length; _i++) {
                var sym = _a[_i];
                clone[sym.toString()] = clone[sym];
                delete clone[sym];
            }
            return recurse(clone);
        }
        return recurse(value);
    });
};
exports.prepareAstForCompare = prepareAstForCompare;
