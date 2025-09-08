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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Duration = exports.DateTime = exports.TimeOnly = exports.DateOnly = exports.toSimpleDateTime = exports.SimpleDateTime = exports.toSimpleTime = exports.SimpleTime = exports.toSimpleDate = exports.SimpleDate = void 0;
var effect_1 = require("effect");
var types_1 = require("./types");
/**
 * Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.
 *
 * NOTE: HyperFormula uses Excel's time format (null date 1900/01/01)
 * It can be configured to use a different parser via `parseDateTime`.
 * https://hyperformula.handsontable.com/guide/date-and-time-handling.html#date-and-time-handling
 * https://github.com/handsontable/hyperformula/blob/master/src/DateTimeHelper.ts
 */
// TODO(burdon): Annotations not present in JSON.
// TODO(burdon): Timezone.
// TODO(burdon): Format for timestamp (Unix UTC or ISO 8601)?
// TODO(burdon): Refs
//  - https://www.npmjs.com/package/numfmt
//  - https://date-fns.org/docs/Getting-Started
//  - https://github.com/date-fns/tz
/**
 * Simple date compatible with HF.
 */
exports.SimpleDate = effect_1.Schema.Struct({
    year: effect_1.Schema.Number.pipe(effect_1.Schema.between(1900, 9999)),
    month: effect_1.Schema.Number.pipe(effect_1.Schema.between(1, 12)),
    day: effect_1.Schema.Number.pipe(effect_1.Schema.between(1, 31)),
});
var toSimpleDate = function (date) { return ({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
}); };
exports.toSimpleDate = toSimpleDate;
/**
 * Simple time compatible with HF.
 */
exports.SimpleTime = effect_1.Schema.Struct({
    hours: effect_1.Schema.Number.pipe(effect_1.Schema.between(0, 23)),
    minutes: effect_1.Schema.Number.pipe(effect_1.Schema.between(0, 59)),
    seconds: effect_1.Schema.Number.pipe(effect_1.Schema.between(0, 59)),
});
var toSimpleTime = function (date) { return ({
    hours: date.getUTCHours(),
    minutes: date.getUTCSeconds(),
    seconds: date.getUTCSeconds(),
}); };
exports.toSimpleTime = toSimpleTime;
/**
 * Simple date-time compatible with HF.
 */
exports.SimpleDateTime = effect_1.Schema.extend(exports.SimpleDate, exports.SimpleTime);
var toSimpleDateTime = function (date) { return (__assign(__assign({}, (0, exports.toSimpleDate)(date)), (0, exports.toSimpleTime)(date))); };
exports.toSimpleDateTime = toSimpleDateTime;
/**
 * https://effect.website/docs/guides/schema/transformations#date-transformations
 */
// TODO(burdon): Consider if transformations should be supported with Automerge.
/**
 * Format: 2018-11-13
 */
exports.DateOnly = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Date), effect_1.Schema.annotations({
    title: 'Date',
    description: 'Valid date in ISO format',
}));
/**
 * Format: 20:20:39+00:00
 */
exports.TimeOnly = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Time), effect_1.Schema.annotations({
    title: 'Time',
    description: 'Valid time in ISO format',
}));
/**
 * Format: 2018-11-13T20:20:39+00:00
 */
exports.DateTime = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.DateTime), effect_1.Schema.annotations({
    title: 'DateTime',
    description: 'Valid date and time in ISO format',
}));
/**
 * https://datatracker.ietf.org/doc/html/rfc3339#appendix-A
 */
// TODO(burdon): Define duration type.
exports.Duration = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Duration), effect_1.Schema.annotations((_a = {
        title: 'Duration',
        description: 'Duration in ISO 8601 format'
    },
    _a[effect_1.SchemaAST.ExamplesAnnotationId] = ['1h', '3D'],
    _a)));
//
// Utils
//
// YYYY-MM-DD
var DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
var _isValidDateFormat = function (str) { return DATE_REGEX.test(str); };
var _isValidDate = function (str) {
    var date = new Date(str);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(str);
};
// HH:mm:ss
var TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
var _isValidTimeFormat = function (str) { return TIME_REGEX.test(str); };
