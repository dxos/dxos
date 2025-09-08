"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSchema = void 0;
var json_schema_type_1 = require("./json-schema-type");
/**
 * Normalize schema to to draft-07 format.
 * Note: the input type does not necessarily match the {@link JsonSchemaType} type.
 */
var normalizeSchema = function (schema) {
    var copy = structuredClone(schema);
    go(copy);
    return copy;
};
exports.normalizeSchema = normalizeSchema;
var go = function (schema) {
    if (typeof schema !== 'object' || schema === null) {
        return;
    }
    if (schema.exclusiveMaximum === true) {
        schema.exclusiveMaximum = schema.maximum;
        delete schema.exclusiveMaximum;
    }
    else if (schema.exclusiveMaximum === false) {
        delete schema.exclusiveMaximum;
    }
    if (schema.exclusiveMinimum === true) {
        schema.exclusiveMinimum = schema.minimum;
        delete schema.exclusiveMinimum;
    }
    else if (schema.exclusiveMinimum === false) {
        delete schema.exclusiveMinimum;
    }
    // Delete all properties that are not in the JsonSchemaFields.
    for (var _i = 0, _a = Object.keys(schema); _i < _a.length; _i++) {
        var key = _a[_i];
        if (!json_schema_type_1.JsonSchemaFields.includes(key)) {
            delete schema[key];
        }
    }
    // Recursively normalize the schema.
    // Recursively normalize the schema.
    if (schema.properties) {
        goOnRecord(schema.properties);
    }
    if (schema.patternProperties) {
        goOnRecord(schema.patternProperties);
    }
    if (schema.propertyNames) {
        go(schema.propertyNames);
    }
    if (schema.definitions) {
        goOnRecord(schema.definitions);
    }
    if (schema.items) {
        maybeGoOnArray(schema.items);
    }
    if (schema.additionalItems) {
        maybeGoOnArray(schema.additionalItems);
    }
    if (schema.contains) {
        go(schema.contains);
    }
    if (schema.if) {
        go(schema.if);
    }
    if (schema.then) {
        go(schema.then);
    }
    if (schema.else) {
        go(schema.else);
    }
    if (schema.allOf) {
        maybeGoOnArray(schema.allOf);
    }
    if (schema.anyOf) {
        maybeGoOnArray(schema.anyOf);
    }
    if (schema.oneOf) {
        maybeGoOnArray(schema.oneOf);
    }
    if (schema.not) {
        go(schema.not);
    }
    if (schema.$defs) {
        goOnRecord(schema.$defs);
    }
    if (schema.reference) {
        go(schema.reference.schema);
    }
};
var maybeGoOnArray = function (value) {
    if (Array.isArray(value)) {
        for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
            var item = value_1[_i];
            go(item);
        }
    }
    else if (typeof value === 'object' && value !== null) {
        go(value);
    }
};
var goOnRecord = function (record) {
    for (var _i = 0, _a = Object.keys(record); _i < _a.length; _i++) {
        var key = _a[_i];
        go(record[key]);
    }
};
