"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var json_1 = require("../json");
var format_1 = require("./format");
var types_1 = require("./types");
(0, vitest_1.describe)('formats', function () {
    (0, vitest_1.test)('annotations', function (_a) {
        var expect = _a.expect;
        var TestSchema = effect_1.Schema.Struct({
            name: effect_1.Schema.String,
            email: effect_1.Schema.optional(format_1.Format.Email),
            salary: effect_1.Schema.optional(format_1.Format.Currency({ decimals: 2, code: 'usd' })),
            website: effect_1.Schema.optional(format_1.Format.URL),
            birthday: effect_1.Schema.optional(format_1.Format.Date),
            started: effect_1.Schema.optional(format_1.Format.DateTime),
            active: effect_1.Schema.optional(effect_1.Schema.Boolean),
        }).pipe(effect_1.Schema.mutable);
        var jsonSchema = (0, json_1.toJsonSchema)(TestSchema);
        var data = {
            name: 'Alice',
            email: 'alice@example.com',
            birthday: '1999-06-11',
        };
        var validate = effect_1.Schema.validateSync(TestSchema);
        validate(data);
        {
            var prop = jsonSchema.properties['active'];
            expect((0, types_1.getTypeEnum)(prop)).to.eq(types_1.TypeEnum.Boolean);
            expect(prop).includes({
                type: types_1.TypeEnum.Boolean,
            });
        }
        {
            var prop = jsonSchema.properties['email'];
            expect((0, types_1.getTypeEnum)(prop)).to.eq(types_1.TypeEnum.String);
            expect(prop).includes({
                type: types_1.TypeEnum.String,
                format: types_1.FormatEnum.Email,
                title: 'Email',
            });
        }
        {
            var prop = jsonSchema.properties['salary'];
            expect((0, types_1.getTypeEnum)(prop)).to.eq(types_1.TypeEnum.Number);
            expect(prop).includes({
                type: types_1.TypeEnum.Number,
                format: types_1.FormatEnum.Currency,
                title: 'Currency',
                multipleOf: 0.01,
                currency: 'USD',
            });
        }
        {
            var prop = jsonSchema.properties['birthday'];
            expect((0, types_1.getTypeEnum)(prop)).to.eq(types_1.TypeEnum.String);
            expect(prop).includes({
                type: types_1.TypeEnum.String,
                format: types_1.FormatEnum.Date,
            });
        }
    });
});
