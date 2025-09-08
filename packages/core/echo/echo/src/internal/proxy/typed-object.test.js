"use strict";
//
// Copyright 2024 DXOS.org
//
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var internal_1 = require("@dxos/echo/internal");
var object_1 = require("./object");
var Organization = effect_1.Schema.Struct({
    name: effect_1.Schema.String,
}).pipe((0, internal_1.EchoObject)({
    typename: 'example.com/type/Organization',
    version: '0.1.0',
}));
var Contact = effect_1.Schema.Struct({
    name: effect_1.Schema.String,
}, { key: effect_1.Schema.String, value: effect_1.Schema.Any }).pipe(effect_1.Schema.partial, (0, internal_1.EchoObject)({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
}));
var TEST_ORG = { name: 'Test' };
(0, vitest_1.describe)('EchoObject class DSL', function () {
    (0, vitest_1.test)('can get object schema', function () { return __awaiter(void 0, void 0, void 0, function () {
        var obj;
        return __generator(this, function (_a) {
            obj = (0, object_1.live)(Organization, TEST_ORG);
            (0, vitest_1.expect)((0, internal_1.getSchema)(obj)).to.deep.eq(Organization);
            return [2 /*return*/];
        });
    }); });
    (0, vitest_1.describe)('class options', function () {
        (0, vitest_1.test)('can assign undefined to partial fields', function () { return __awaiter(void 0, void 0, void 0, function () {
            var person;
            return __generator(this, function (_a) {
                person = (0, object_1.live)(Contact, { name: 'John' });
                person.name = undefined;
                person.recordField = 'hello';
                (0, vitest_1.expect)(person.name).to.be.undefined;
                (0, vitest_1.expect)(person.recordField).to.eq('hello');
                return [2 /*return*/];
            });
        }); });
    });
    (0, vitest_1.test)('record', function () {
        var _a, _b, _c;
        var schema = effect_1.Schema.mutable(effect_1.Schema.Struct({
            meta: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Any)),
            // NOTE: Schema.Record only supports shallow values.
            // https://www.npmjs.com/package/@effect/schema#mutable-records
            // meta: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any }))),
            // meta: Schema.optional(Schema.mutable(Schema.object)),
        }));
        {
            var object = (0, object_1.live)(schema, {});
            ((_a = object.meta) !== null && _a !== void 0 ? _a : (object.meta = {})).test = 100;
            (0, vitest_1.expect)(object.meta.test).to.eq(100);
        }
        {
            var object = (0, object_1.live)(schema, {});
            object.meta = { test: { value: 300 } };
            (0, vitest_1.expect)(object.meta.test.value).to.eq(300);
        }
        {
            var object = {};
            ((_b = object.meta) !== null && _b !== void 0 ? _b : (object.meta = {})).test = 100;
            (0, vitest_1.expect)(object.meta.test).to.eq(100);
        }
        {
            var Test2 = /** @class */ (function (_super) {
                __extends(Test2, _super);
                function Test2() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return Test2;
            }((0, internal_1.TypedObject)({
                typename: 'dxos.org/type/FunctionTrigger',
                version: '0.1.0',
            })({
                meta: effect_1.Schema.optional(effect_1.Schema.mutable(effect_1.Schema.Record({ key: effect_1.Schema.String, value: effect_1.Schema.Any }))),
            })));
            var object = (0, object_1.live)(Test2, {});
            ((_c = object.meta) !== null && _c !== void 0 ? _c : (object.meta = {})).test = 100;
            (0, vitest_1.expect)(object.meta.test).to.eq(100);
        }
    });
});
