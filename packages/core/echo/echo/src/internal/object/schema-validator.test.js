"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var util_1 = require("@dxos/util");
var schema_validator_1 = require("./schema-validator");
(0, vitest_1.describe)('schema-validator', function () {
    (0, vitest_1.describe)('validateSchema', function () {
        (0, vitest_1.test)('throws on ambiguous discriminated type union', function () {
            var TestSchema = effect_1.Schema.Struct({
                union: effect_1.Schema.Union(effect_1.Schema.Struct({ a: effect_1.Schema.Number }), effect_1.Schema.Struct({ b: effect_1.Schema.String })),
            });
            (0, vitest_1.expect)(function () { return schema_validator_1.SchemaValidator.validateSchema(TestSchema); }).to.throw();
        });
    });
    (0, vitest_1.describe)('hasPropertyAnnotation', function () {
        (0, vitest_1.test)('has annotation', function () {
            var _a;
            var annotationId = Symbol('foo');
            var annotationValue = 'bar';
            var TestSchema = effect_1.Schema.Struct({
                name: effect_1.Schema.String.annotations((_a = {}, _a[annotationId] = annotationValue, _a)),
                parent: effect_1.Schema.optional(effect_1.Schema.suspend(function () {
                    var _a;
                    return TestSchema.annotations((_a = {}, _a[annotationId] = annotationValue, _a));
                })),
                friends: effect_1.Schema.suspend(function () {
                    var _a;
                    return effect_1.Schema.mutable(effect_1.Schema.Array(TestSchema.annotations((_a = {}, _a[annotationId] = annotationValue, _a))));
                }),
            });
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.hasTypeAnnotation(TestSchema, 'name', annotationId)).to.be.true;
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.hasTypeAnnotation(TestSchema, 'parent', annotationId)).to.be.true;
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.hasTypeAnnotation(TestSchema, 'friends', annotationId)).to.be.true;
        });
        (0, vitest_1.test)('no annotation', function () {
            var annotationId = Symbol('foo');
            var Person = effect_1.Schema.Struct({
                name: effect_1.Schema.String,
                parent: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return Person; })),
                friends: effect_1.Schema.suspend(function () { return effect_1.Schema.mutable(effect_1.Schema.Array(Person)); }),
            });
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.hasTypeAnnotation(Person, 'name', annotationId)).to.be.false;
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.hasTypeAnnotation(Person, 'parent', annotationId)).to.be.false;
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.hasTypeAnnotation(Person, 'friends', annotationId)).to.be.false;
        });
    });
    (0, vitest_1.describe)('getPropertySchema', function () {
        var validateValueToAssign = function (args) {
            var expectation = (0, vitest_1.expect)(function () {
                var nestedSchema = schema_validator_1.SchemaValidator.getPropertySchema(args.schema, args.path, function (path) {
                    return (0, util_1.getDeep)(args.target, path);
                });
                effect_1.Schema.validateSync(nestedSchema)(args.valueToAssign);
            });
            if (args.expectToThrow) {
                expectation.to.throw();
            }
            else {
                expectation.not.to.throw();
            }
        };
        (0, vitest_1.test)('basic', function () {
            for (var _i = 0, _a = [42, '42']; _i < _a.length; _i++) {
                var value = _a[_i];
                validateValueToAssign({
                    schema: effect_1.Schema.Struct({ object: effect_1.Schema.Struct({ field: effect_1.Schema.Number }) }),
                    target: {},
                    path: ['object', 'field'],
                    valueToAssign: value,
                    expectToThrow: typeof value !== 'number',
                });
            }
        });
        (0, vitest_1.test)('preserves annotations', function () {
            var annotationId = Symbol('foo');
            var annotationValue = 'bar';
            var Person = effect_1.Schema.Struct({
                parent: effect_1.Schema.optional(effect_1.Schema.suspend(function () {
                    var _a;
                    return Person.annotations((_a = {}, _a[annotationId] = annotationValue, _a));
                })),
                friends: effect_1.Schema.suspend(function () {
                    var _a;
                    return effect_1.Schema.mutable(effect_1.Schema.Array(Person.annotations((_a = {}, _a[annotationId] = annotationValue, _a))));
                }),
            });
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.getPropertySchema(Person, ['parent']).ast.annotations[annotationId]).to.eq(annotationValue);
            (0, vitest_1.expect)(schema_validator_1.SchemaValidator.getPropertySchema(Person, ['friends', '0']).ast.annotations[annotationId]).to.eq(annotationValue);
        });
        (0, vitest_1.test)('discriminated union', function () {
            var square = effect_1.Schema.Struct({ type: effect_1.Schema.Literal('square'), side: effect_1.Schema.Number });
            var circle = effect_1.Schema.Struct({ type: effect_1.Schema.Literal('circle'), radius: effect_1.Schema.Number });
            var shape = effect_1.Schema.Union(square, circle);
            validateValueToAssign({
                schema: shape,
                target: { type: 'square' },
                path: ['side'],
                valueToAssign: 1,
            });
            validateValueToAssign({
                schema: shape,
                target: { type: 'circle' },
                path: ['side'],
                valueToAssign: 1,
                expectToThrow: true,
            });
            validateValueToAssign({
                schema: shape,
                target: { type: 'square' },
                path: ['radius'],
                valueToAssign: 1,
                expectToThrow: true,
            });
        });
        (0, vitest_1.test)('any', function () {
            validateValueToAssign({
                schema: effect_1.Schema.Any,
                target: { field: { nested: { value: effect_1.Schema.Number } } },
                path: ['field', 'nested'],
                valueToAssign: { any: 'value' },
            });
        });
        (0, vitest_1.test)('index signatures', function () {
            for (var _i = 0, _a = [42, '42']; _i < _a.length; _i++) {
                var value = _a[_i];
                validateValueToAssign({
                    schema: effect_1.Schema.Struct({ field: effect_1.Schema.String }, { key: effect_1.Schema.String, value: effect_1.Schema.Number }),
                    target: {},
                    path: ['unknownField'],
                    valueToAssign: value,
                    expectToThrow: typeof value !== 'number',
                });
            }
        });
        (0, vitest_1.test)('index signature from optional record', function () {
            for (var _i = 0, _a = [42, '42']; _i < _a.length; _i++) {
                var value = _a[_i];
                validateValueToAssign({
                    schema: effect_1.Schema.Struct({
                        field: effect_1.Schema.optional(effect_1.Schema.Record({ key: effect_1.Schema.String, value: effect_1.Schema.Number })),
                    }),
                    target: {},
                    path: ['field', 'unknownField'],
                    valueToAssign: value,
                    expectToThrow: typeof value !== 'number',
                });
            }
        });
        (0, vitest_1.test)('suspend', function () {
            var schemaWithSuspend = effect_1.Schema.Struct({
                array: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return effect_1.Schema.Array(effect_1.Schema.Union(effect_1.Schema.Null, effect_1.Schema.Number)); })),
                object: effect_1.Schema.optional(effect_1.Schema.suspend(function () { return effect_1.Schema.Union(effect_1.Schema.Null, effect_1.Schema.Struct({ field: effect_1.Schema.Number })); })),
            });
            var target = { array: [1, 2, null], object: { field: 3 } };
            for (var _i = 0, _a = [42, '42']; _i < _a.length; _i++) {
                var value = _a[_i];
                for (var _b = 0, _c = [
                    ['array', '0'],
                    ['object', 'field'],
                ]; _b < _c.length; _b++) {
                    var path = _c[_b];
                    validateValueToAssign({
                        schema: schemaWithSuspend,
                        target: target,
                        path: path,
                        valueToAssign: value,
                        expectToThrow: typeof value !== 'number',
                    });
                }
            }
        });
    });
});
