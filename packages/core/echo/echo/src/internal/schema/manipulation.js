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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTypenameInSchema = exports.updateFieldNameInSchema = exports.removeFieldsFromSchema = exports.updateFieldsInSchema = exports.addFieldsToSchema = void 0;
var effect_1 = require("effect");
var invariant_1 = require("@dxos/invariant");
var ast_1 = require("../ast");
// TODO(ZaymonFC): Do this one at a time. This might be dangerous.
var addFieldsToSchema = function (schema, fields) {
    var schemaExtension = effect_1.Schema.partial(effect_1.Schema.Struct(fields));
    return effect_1.Schema.extend(schema, schemaExtension).annotations(schema.ast.annotations);
};
exports.addFieldsToSchema = addFieldsToSchema;
var updateFieldsInSchema = function (schema, fields) {
    var ast = schema.ast;
    (0, invariant_1.invariant)(effect_1.SchemaAST.isTypeLiteral(ast));
    var updatedProperties = __spreadArray([], ast.propertySignatures, true);
    var propertiesToUpdate = effect_1.Schema.partial(effect_1.Schema.Struct(fields)).ast.propertySignatures;
    var _loop_1 = function (property) {
        var index = updatedProperties.findIndex(function (p) { return p.name === property.name; });
        if (index !== -1) {
            updatedProperties[index] = property;
        }
        else {
            updatedProperties.push(property);
        }
    };
    for (var _i = 0, propertiesToUpdate_1 = propertiesToUpdate; _i < propertiesToUpdate_1.length; _i++) {
        var property = propertiesToUpdate_1[_i];
        _loop_1(property);
    }
    return effect_1.Schema.make(new effect_1.SchemaAST.TypeLiteral(updatedProperties, ast.indexSignatures, ast.annotations));
};
exports.updateFieldsInSchema = updateFieldsInSchema;
var removeFieldsFromSchema = function (schema, fieldNames) {
    return effect_1.Schema.make(effect_1.SchemaAST.omit(schema.ast, fieldNames)).annotations(schema.ast.annotations);
};
exports.removeFieldsFromSchema = removeFieldsFromSchema;
var updateFieldNameInSchema = function (schema, _a) {
    var before = _a.before, after = _a.after;
    var ast = schema.ast;
    (0, invariant_1.invariant)(effect_1.SchemaAST.isTypeLiteral(ast));
    return effect_1.Schema.make(new effect_1.SchemaAST.TypeLiteral(ast.propertySignatures.map(function (p) {
        return p.name === before
            ? new effect_1.SchemaAST.PropertySignature(after, p.type, p.isOptional, p.isReadonly, p.annotations)
            : p;
    }), ast.indexSignatures, ast.annotations));
};
exports.updateFieldNameInSchema = updateFieldNameInSchema;
var setTypenameInSchema = function (schema, typename) {
    var _a;
    var existingAnnotation = schema.ast.annotations[ast_1.TypeAnnotationId];
    (0, invariant_1.invariant)(existingAnnotation, "Missing ".concat(String(ast_1.TypeAnnotationId)));
    return schema.annotations(__assign(__assign({}, schema.ast.annotations), (_a = {}, _a[ast_1.TypeAnnotationId] = {
        kind: existingAnnotation.kind,
        typename: typename,
        version: existingAnnotation.version,
    }, _a)));
};
exports.setTypenameInSchema = setTypenameInSchema;
