"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnnotationHelper = void 0;
var effect_1 = require("effect");
var createAnnotationHelper = function (id) {
    return {
        get: function (schema) { return effect_1.SchemaAST.getAnnotation(schema.ast, id); },
        set: function (value) {
            return function (schema) {
                var _a;
                return schema.annotations((_a = {}, _a[id] = value, _a));
            };
        },
    };
};
exports.createAnnotationHelper = createAnnotationHelper;
