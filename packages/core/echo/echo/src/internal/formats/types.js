"use strict";
//
// Copyright 2024 DXOS.org
//
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptionsAnnotation = exports.OptionsAnnotationId = exports.formatToType = exports.typeToFormat = exports.PropertyKind = exports.FormatEnums = exports.FormatEnum = exports.getFormatAnnotation = exports.FormatAnnotation = exports.FormatAnnotationId = exports.getTypeEnum = exports.TypeEnum = void 0;
var effect_1 = require("effect");
var ast_1 = require("../ast");
// TODO(burdon): Rename ValueType and change to disciminated union.
// export type ValueType = 'array' | 'object' | 'string' | 'number' | 'boolean' | 'ref';
var TypeEnum;
(function (TypeEnum) {
    TypeEnum["Array"] = "array";
    TypeEnum["Object"] = "object";
    TypeEnum["String"] = "string";
    TypeEnum["Number"] = "number";
    TypeEnum["Boolean"] = "boolean";
    TypeEnum["Ref"] = "ref";
})(TypeEnum || (exports.TypeEnum = TypeEnum = {}));
// TODO(burdon): Ref?
var getTypeEnum = function (property) {
    switch (property.type) {
        case 'array':
            return TypeEnum.Array;
        case 'object':
            return TypeEnum.Object;
        case 'string':
            return TypeEnum.String;
        case 'number':
            return TypeEnum.Number;
        case 'boolean':
            return TypeEnum.Boolean;
        default:
            return undefined;
    }
};
exports.getTypeEnum = getTypeEnum;
/**
 * https://json-schema.org/understanding-json-schema/reference/schema
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 */
exports.FormatAnnotationId = Symbol.for('@dxos/schema/annotation/Format');
exports.FormatAnnotation = (0, ast_1.createAnnotationHelper)(exports.FormatAnnotationId);
var getFormatAnnotation = function (node) {
    return (0, effect_1.pipe)(effect_1.SchemaAST.getAnnotation(exports.FormatAnnotationId)(node), effect_1.Option.getOrUndefined);
};
exports.getFormatAnnotation = getFormatAnnotation;
// TODO(burdon): Rename to FormatType and change to discriminated union.
var FormatEnum;
(function (FormatEnum) {
    FormatEnum["None"] = "none";
    FormatEnum["String"] = "string";
    FormatEnum["Number"] = "number";
    FormatEnum["Boolean"] = "boolean";
    FormatEnum["Ref"] = "ref";
    //
    // { type: 'string' }
    //
    FormatEnum["DID"] = "did";
    FormatEnum["DXN"] = "dxn";
    FormatEnum["Email"] = "email";
    FormatEnum["Formula"] = "formula";
    FormatEnum["Hostname"] = "hostname";
    FormatEnum["JSON"] = "json";
    FormatEnum["Markdown"] = "markdown";
    FormatEnum["Regex"] = "regex";
    FormatEnum["SingleSelect"] = "single-select";
    FormatEnum["MultiSelect"] = "multi-select";
    FormatEnum["URL"] = "url";
    FormatEnum["UUID"] = "uuid";
    //
    // { type: 'number' }
    //
    FormatEnum["Currency"] = "currency";
    FormatEnum["Integer"] = "integer";
    FormatEnum["Percent"] = "percent";
    FormatEnum["Timestamp"] = "timestamp";
    //
    // { type: 'date' }
    //
    FormatEnum["DateTime"] = "date-time";
    FormatEnum["Date"] = "date";
    FormatEnum["Time"] = "time";
    FormatEnum["Duration"] = "duration";
    //
    // { type: 'object' }
    //
    FormatEnum["GeoPoint"] = "latlng";
})(FormatEnum || (exports.FormatEnum = FormatEnum = {}));
exports.FormatEnums = Object.values(FormatEnum).sort();
exports.PropertyKind = {
    type: TypeEnum,
    format: FormatEnum,
};
/**
 * Default formats
 */
exports.typeToFormat = (_a = {},
    _a[TypeEnum.String] = FormatEnum.String,
    _a[TypeEnum.Number] = FormatEnum.Number,
    _a[TypeEnum.Boolean] = FormatEnum.Boolean,
    _a);
/**
 * Map of format to type.
 */
exports.formatToType = (_b = {},
    _b[FormatEnum.None] = undefined,
    _b[FormatEnum.String] = TypeEnum.String,
    _b[FormatEnum.Number] = TypeEnum.Number,
    _b[FormatEnum.Boolean] = TypeEnum.Boolean,
    _b[FormatEnum.Ref] = TypeEnum.Ref,
    // Strings
    _b[FormatEnum.DID] = TypeEnum.String,
    _b[FormatEnum.DXN] = TypeEnum.String,
    _b[FormatEnum.Email] = TypeEnum.String,
    _b[FormatEnum.Formula] = TypeEnum.String,
    _b[FormatEnum.Hostname] = TypeEnum.String,
    _b[FormatEnum.JSON] = TypeEnum.String,
    _b[FormatEnum.Markdown] = TypeEnum.String,
    _b[FormatEnum.Regex] = TypeEnum.String,
    _b[FormatEnum.URL] = TypeEnum.String,
    _b[FormatEnum.UUID] = TypeEnum.String,
    _b[FormatEnum.SingleSelect] = TypeEnum.String,
    _b[FormatEnum.MultiSelect] = TypeEnum.Object,
    // Dates
    _b[FormatEnum.Date] = TypeEnum.String,
    _b[FormatEnum.DateTime] = TypeEnum.String,
    _b[FormatEnum.Duration] = TypeEnum.String,
    _b[FormatEnum.Time] = TypeEnum.String,
    // Numbers
    _b[FormatEnum.Currency] = TypeEnum.Number,
    _b[FormatEnum.Integer] = TypeEnum.Number,
    _b[FormatEnum.Percent] = TypeEnum.Number,
    _b[FormatEnum.Timestamp] = TypeEnum.Number,
    // Objects
    _b[FormatEnum.GeoPoint] = TypeEnum.Object,
    _b);
/**
 * Allowed value options for select.
 */
exports.OptionsAnnotationId = Symbol.for('@dxos/schema/annotation/Options');
var getOptionsAnnotation = function (node) {
    return (0, effect_1.pipe)(effect_1.SchemaAST.getAnnotation(exports.OptionsAnnotationId)(node), effect_1.Option.getOrUndefined);
};
exports.getOptionsAnnotation = getOptionsAnnotation;
