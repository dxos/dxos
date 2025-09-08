"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.Format = void 0;
var effect_1 = require("effect");
var Keys = require("@dxos/keys");
var DateUtil = require("./date");
var NumberUtil = require("./number");
var ObjectUtil = require("./object");
var StringUtil = require("./string");
// TODO(burdon): Consider factoring out to separate `@dxos/json-schema`
// TODO(burdon): Media encoding.
//  - https://json-schema.org/understanding-json-schema/reference/non_json_data
/**
 * Formats.
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * NOTE: A JSON Schema validator will ignore any format type that it does not understand.
 */
// TODO(burdon): Add fields for `examples`, `message`, etc.
var Format;
(function (Format) {
    // Strings
    Format.DXN = Keys.DXN.Schema;
    Format.Email = StringUtil.Email;
    Format.Formula = StringUtil.Formula;
    Format.Hostname = StringUtil.Hostname;
    Format.JSON = StringUtil.JSON;
    Format.Markdown = StringUtil.Markdown;
    Format.Regex = StringUtil.Regex;
    Format.URL = StringUtil.URL;
    Format.UUID = effect_1.Schema.UUID;
    // Numbers
    // TODO(burdon): BigInt.
    Format.Currency = NumberUtil.Currency;
    Format.Integer = NumberUtil.Integer;
    Format.Percent = NumberUtil.Percent;
    Format.Timestamp = NumberUtil.Timestamp;
    // Dates and times
    Format.DateTime = DateUtil.DateTime;
    Format.Date = DateUtil.DateOnly;
    Format.Time = DateUtil.TimeOnly;
    Format.Duration = DateUtil.Duration;
    // Objects
    Format.GeoPoint = ObjectUtil.GeoPoint;
})(Format || (exports.Format = Format = {}));
