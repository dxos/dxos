"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var object_1 = require("../object");
var annotations_1 = require("./annotations");
// TODO(dmaretskyi): Use one of the testing schemas.
var TestObject = effect_1.Schema.Struct({
    name: effect_1.Schema.optional(effect_1.Schema.String),
    fallbackName: effect_1.Schema.optional(effect_1.Schema.String),
    other: effect_1.Schema.String,
}).pipe(annotations_1.LabelAnnotation.set(['name', 'fallbackName']));
var a = TestObject;
console.log(a);
var TestEchoSchema = TestObject.pipe((0, object_1.EchoObject)({
    typename: 'dxos.org/type/Test',
    version: '0.1.0',
}));
(0, vitest_1.describe)('annotations', function () {
    (0, vitest_1.describe)('Typename', function () {
        (0, vitest_1.test)('should validate typename', function (_a) {
            var expect = _a.expect;
            // Valid.
            expect(annotations_1.Typename.make('dxos.org/type/foo')).to.exist;
            expect(annotations_1.Typename.make('dxos.org/type/foo-bar')).to.exist;
            expect(annotations_1.Typename.make('dxos.org/type/foo_bar')).to.exist;
            // Invalid.
            expect(function () { return annotations_1.Typename.make('dxn:dxos.org'); }).to.throw();
            expect(function () { return annotations_1.Typename.make('2dxos.org'); }).to.throw();
            expect(function () { return annotations_1.Typename.make('dxos org'); }).to.throw();
        });
        (0, vitest_1.test)('should validate version', function (_a) {
            var expect = _a.expect;
            // Valid.
            expect(annotations_1.Version.make('0.1.0')).to.exist;
            // Invalid.
            expect(function () { return annotations_1.Version.make('0.1.x'); }).to.throw();
            expect(function () { return annotations_1.Version.make('0.1.0-alpha'); }).to.throw();
        });
    });
    (0, vitest_1.describe)('getLabel', function () {
        (0, vitest_1.test)('should return first available label value', function (_a) {
            var expect = _a.expect;
            var obj = {
                name: 'Primary Name',
                fallbackName: 'Fallback Name',
                other: 'Other',
            };
            expect((0, object_1.getLabel)(TestObject, obj)).toEqual('Primary Name');
        });
        (0, vitest_1.test)('should fallback to second path if first is undefined', function (_a) {
            var expect = _a.expect;
            var obj = {
                name: undefined,
                fallbackName: 'Fallback Name',
                other: 'Other',
            };
            expect((0, object_1.getLabel)(TestObject, obj)).toEqual('Fallback Name');
        });
        (0, vitest_1.test)('should return undefined if no label paths resolve', function (_a) {
            var expect = _a.expect;
            var obj = {
                name: undefined,
                fallbackName: undefined,
                other: 'Other',
            };
            expect((0, object_1.getLabel)(TestObject, obj)).toBeUndefined();
        });
        (0, vitest_1.test)('should return label from echo object', function (_a) {
            var expect = _a.expect;
            var obj = {
                id: 'test',
                name: 'Primary Name',
                fallbackName: 'Fallback Name',
                other: 'Other',
            };
            expect((0, object_1.getLabel)(TestEchoSchema, obj)).toEqual('Primary Name');
        });
    });
});
