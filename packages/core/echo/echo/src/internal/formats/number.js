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
exports.Timestamp = exports.Percent = exports.Integer = exports.Currency = exports.CurrencyAnnotationId = exports.DecimalPrecision = void 0;
var effect_1 = require("effect");
var types_1 = require("./types");
var encodeMultipleOf = function (divisor) { return 1 / Math.pow(10, divisor); };
var encodeMultiple = function (divisor) {
    return function (self) {
        return divisor === undefined || divisor === 0 ? self : self.pipe(effect_1.Schema.multipleOf(encodeMultipleOf(divisor)));
    };
};
/**
 * Convert number of digits to multipleOf annotation.
 */
exports.DecimalPrecision = effect_1.Schema.transform(effect_1.Schema.Number, effect_1.Schema.Number, {
    strict: true,
    encode: function (value) { return encodeMultipleOf(value); },
    decode: function (value) { return Math.log10(1 / value); },
}).annotations({
    title: 'Number of digits',
});
exports.CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/Currency');
/**
 * ISO 4217 currency code.
 */
var Currency = function (_a) {
    var _b;
    var _c = _a === void 0 ? { decimals: 2 } : _a, decimals = _c.decimals, code = _c.code;
    return effect_1.Schema.Number.pipe(encodeMultiple(decimals), types_1.FormatAnnotation.set(types_1.FormatEnum.Currency), effect_1.Schema.annotations(__assign({ title: 'Currency', description: 'Currency value' }, (code ? (_b = {}, _b[exports.CurrencyAnnotationId] = code.toUpperCase(), _b) : {}))));
};
exports.Currency = Currency;
/**
 * Integer.
 */
var Integer = function () {
    return effect_1.Schema.Number.pipe(effect_1.Schema.int(), types_1.FormatAnnotation.set(types_1.FormatEnum.Integer), effect_1.Schema.annotations({
        title: 'Integer',
        description: 'Integer value',
    }));
};
exports.Integer = Integer;
/**
 * Percent.
 */
// TODO(burdon): Define min/max (e.g., 0, 1).
var Percent = function (_a) {
    var _b = _a === void 0 ? { decimals: 2 } : _a, decimals = _b.decimals;
    return effect_1.Schema.Number.pipe(encodeMultiple(decimals), types_1.FormatAnnotation.set(types_1.FormatEnum.Percent), effect_1.Schema.annotations({
        title: 'Percent',
        description: 'Percentage value',
    }));
};
exports.Percent = Percent;
/**
 * Unix timestamp.
 * https://en.wikipedia.org/wiki/Unix_time
 */
exports.Timestamp = effect_1.Schema.Number.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Timestamp), effect_1.Schema.annotations({
    title: 'Timestamp',
    description: 'Unix timestamp',
}));
