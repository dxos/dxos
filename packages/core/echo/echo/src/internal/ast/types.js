"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldPath = exports.FIELD_PATH_ANNOTATION = void 0;
var annotations_1 = require("./annotations");
/**
 * @internal
 */
exports.FIELD_PATH_ANNOTATION = 'path';
/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
// TODO(burdon): Field, vs. path vs. property.
var FieldPath = function (path) { return (0, annotations_1.PropertyMeta)(exports.FIELD_PATH_ANNOTATION, path); };
exports.FieldPath = FieldPath;
