"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var log_1 = require("@dxos/log");
(0, vitest_1.test)('json-schema annotations for filter refinement get combined', function () {
    var type = effect_1.Schema.Number.annotations({
        jsonSchema: { foo: 'foo' },
    }).pipe(effect_1.Schema.filter(function () { return true; }, { jsonSchema: { bar: 'bar' } }));
    var jsonSchema = effect_1.JSONSchema.make(type);
    (0, vitest_1.expect)(jsonSchema).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        foo: 'foo',
        bar: 'bar',
    });
});
(0, vitest_1.test)('json-schema annotations on types overrides the default serialization', function () {
    var type = effect_1.Schema.Number.annotations({
        jsonSchema: { foo: 'foo' },
    });
    var jsonSchema = effect_1.JSONSchema.make(type);
    (0, vitest_1.expect)(jsonSchema).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        foo: 'foo',
    });
});
// pass
(0, vitest_1.test)('number with title and description annotations', function () {
    var number = effect_1.Schema.Number.annotations({
        title: 'My Title',
        description: 'My Description',
    });
    (0, vitest_1.expect)(effect_1.JSONSchema.make(number)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'number',
        title: 'My Title',
        description: 'My Description',
    });
});
// pass
(0, vitest_1.test)('date with title and description annotations', function () {
    var date = effect_1.Schema.Date.annotations({
        title: 'My Title',
        description: 'My Description',
    });
    (0, vitest_1.expect)(effect_1.JSONSchema.make(date)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        $defs: {
            Date: {
                description: 'a string to be decoded into a Date',
                type: 'string',
            },
        },
        $ref: '#/$defs/Date',
    });
});
// fail
(0, vitest_1.test)('declare', function () {
    var MyType = /** @class */ (function () {
        function MyType() {
        }
        return MyType;
    }());
    var type = effect_1.Schema.declare(function (x) { return x instanceof MyType; }, {
        jsonSchema: {
            type: 'my-type',
        },
    });
    (0, vitest_1.expect)(effect_1.JSONSchema.make(type)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'my-type',
    });
    (0, vitest_1.expect)(type.pipe(effect_1.Schema.is)(new MyType())).toBe(true);
    (0, vitest_1.expect)(type.pipe(effect_1.Schema.is)({})).toBe(false);
    var withAnnotations = type.annotations({
        title: 'My Title',
        description: 'My Description',
    });
    (0, vitest_1.expect)(effect_1.JSONSchema.make(withAnnotations)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'my-type',
        title: 'My Title',
        description: 'My Description',
    });
});
// pass
(0, vitest_1.test)('declare with refinement', function () {
    var MyType = /** @class */ (function () {
        function MyType() {
        }
        return MyType;
    }());
    var type = effect_1.Schema.declare(function (x) { return x instanceof MyType; }, {
        jsonSchema: {
            type: 'my-type',
        },
    }).pipe(effect_1.Schema.filter(function () { return true; }, { jsonSchema: {} }));
    var named = type.annotations({
        title: 'My Title',
        description: 'My Description',
    });
    (0, vitest_1.expect)(effect_1.JSONSchema.make(named)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'my-type',
        title: 'My Title',
        description: 'My Description',
    });
});
(0, vitest_1.test)("default title annotations don't get serialized", function () {
    var schema = effect_1.Schema.String;
    (0, vitest_1.expect)(effect_1.SchemaAST.getTitleAnnotation(schema.ast).pipe(effect_1.Option.getOrUndefined)).toEqual('string');
    (0, vitest_1.expect)(effect_1.SchemaAST.getDescriptionAnnotation(schema.ast).pipe(effect_1.Option.getOrUndefined)).toEqual('a string');
    (0, vitest_1.expect)(effect_1.JSONSchema.make(schema)).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'string',
    });
});
vitest_1.test.skip('ast comparison', function () {
    log_1.log.info('ast', {
        default: effect_1.Schema.String.ast,
        annotated: effect_1.Schema.String.annotations({ title: 'Custom title', description: 'Custom description' }).ast,
    });
});
