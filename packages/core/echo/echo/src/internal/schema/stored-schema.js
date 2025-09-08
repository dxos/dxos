"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoredSchema = void 0;
var effect_1 = require("effect");
var ast_1 = require("../ast");
var json_schema_1 = require("../json-schema");
var object_1 = require("../object");
/**
 * Persistent representation of a schema.
 */
exports.StoredSchema = effect_1.Schema.Struct({
    name: effect_1.Schema.optional(effect_1.Schema.String),
    typename: ast_1.Typename,
    version: ast_1.Version,
    jsonSchema: json_schema_1.JsonSchemaType,
}).pipe((0, object_1.EchoObject)({
    typename: 'dxos.org/type/Schema',
    version: '0.1.0',
}));
