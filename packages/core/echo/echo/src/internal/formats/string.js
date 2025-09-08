"use strict";
//
// Copyright 2024 DXOS.org
//
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID = exports.URL = exports.Regex = exports.Markdown = exports.JSON = exports.Hostname = exports.Formula = exports.Email = void 0;
var effect_1 = require("effect");
var types_1 = require("./types");
/**
 * Email address (RFC 5321)
 * https://datatracker.ietf.org/doc/html/rfc5321#section-4.1.2
 */
exports.Email = effect_1.Schema.String.pipe(effect_1.Schema.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/), types_1.FormatAnnotation.set(types_1.FormatEnum.Email), effect_1.Schema.annotations({
    title: 'Email',
    description: 'Email address',
}));
/**
 *
 */
// TODO(burdon): Implement.
exports.Formula = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Formula));
/**
 *
 */
// TODO(burdon): Implement.
exports.Hostname = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Hostname));
/**
 *
 */
// TODO(burdon): Implement.
exports.JSON = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.JSON));
/**
 *
 */
// TODO(burdon): Implement.
exports.Markdown = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Markdown));
/**
 * Regex
 * https://json-schema.org/understanding-json-schema/reference/regular_expressions
 * https://ecma-international.org/publications-and-standards/standards/ecma-262
 */
// TODO(burdon): Implement.
exports.Regex = effect_1.Schema.String.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.Regex));
/**
 * https://datatracker.ietf.org/doc/html/rfc3986#section-1.1.3
 */
exports.URL = effect_1.Schema.String.pipe(effect_1.Schema.pattern(/^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i), types_1.FormatAnnotation.set(types_1.FormatEnum.URL), effect_1.Schema.annotations({
    title: 'URL',
    description: 'URL',
}));
/**
 * UUID (RFC 4122)
 * https://datatracker.ietf.org/doc/html/rfc4122
 */
exports.UUID = effect_1.Schema.UUID.pipe(types_1.FormatAnnotation.set(types_1.FormatEnum.UUID), effect_1.Schema.annotations((_a = {},
    _a[effect_1.SchemaAST.ExamplesAnnotationId] = ['3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a'],
    _a)));
