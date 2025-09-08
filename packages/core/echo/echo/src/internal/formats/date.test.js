"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var log_1 = require("@dxos/log");
var json_1 = require("../json");
var date_1 = require("./date");
vitest_1.describe.skip('date', function () {
    (0, vitest_1.test)('basic', function () {
        var date = new Date('2024-12-31T23:59:59Z');
        (0, vitest_1.expect)((0, date_1.toSimpleDate)(date)).to.deep.eq({ year: 2024, month: 12, day: 31 });
        (0, vitest_1.expect)((0, date_1.toSimpleTime)(date)).to.deep.eq({ hours: 23, minutes: 59, seconds: 59 });
    });
    (0, vitest_1.test)('Date', function (_a) {
        var expect = _a.expect;
        var jsonSchema = (0, json_1.toJsonSchema)(date_1.DateOnly);
        (0, log_1.log)('schema', { jsonSchema: jsonSchema });
        var v1 = { year: 1999, month: 12, day: 31 };
        var str = effect_1.Schema.encodeUnknownSync(date_1.DateOnly)(v1);
        var v2 = effect_1.Schema.decodeUnknownSync(date_1.DateOnly)(str);
        expect(v1).to.deep.eq(v2);
    });
    (0, vitest_1.test)('Time', function (_a) {
        var expect = _a.expect;
        var jsonSchema = (0, json_1.toJsonSchema)(date_1.TimeOnly);
        (0, log_1.log)('schema', { jsonSchema: jsonSchema });
        var v1 = { hours: 23, minutes: 59, seconds: 59 };
        var str = effect_1.Schema.encodeUnknownSync(date_1.TimeOnly)(v1);
        var v2 = effect_1.Schema.decodeUnknownSync(date_1.TimeOnly)(str);
        expect(v1).to.deep.eq(v2);
    });
    (0, vitest_1.test)('DateTime', function (_a) {
        var expect = _a.expect;
        var jsonSchema = (0, json_1.toJsonSchema)(date_1.DateTime);
        (0, log_1.log)('schema', { jsonSchema: jsonSchema });
        var v1 = { year: 1999, month: 12, day: 31, hours: 23, minutes: 59, seconds: 59 };
        var str = effect_1.Schema.encodeUnknownSync(date_1.DateTime)(v1);
        var v2 = effect_1.Schema.decodeUnknownSync(date_1.DateTime)(str);
        expect(v1).to.deep.eq(v2);
    });
});
