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
var testing_1 = require("./testing");
// TODO(dmaretskyi): Comment.
var EmptySchemaType = /** @class */ (function (_super) {
    __extends(EmptySchemaType, _super);
    function EmptySchemaType() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return EmptySchemaType;
}((0, internal_1.TypedObject)({
    typename: 'example.com/type/Empty',
    version: '0.1.0',
})({})));
(0, vitest_1.describe)('dynamic schema', function () {
    (0, vitest_1.test)('getProperties filters out id and unwraps optionality', function () { return __awaiter(void 0, void 0, void 0, function () {
        var TestSchema, registered;
        return __generator(this, function (_a) {
            TestSchema = /** @class */ (function (_super) {
                __extends(TestSchema, _super);
                function TestSchema() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return TestSchema;
            }((0, internal_1.TypedObject)({
                typename: 'example.com/type/Test',
                version: '0.1.0',
            })({
                field1: effect_1.Schema.String,
                field2: effect_1.Schema.Boolean,
            })));
            registered = (0, testing_1.createEchoSchema)(TestSchema);
            (0, vitest_1.expect)(registered.getProperties().map(function (p) { return [p.name, p.type]; })).to.deep.eq([
                ['field1', effect_1.SchemaAST.stringKeyword],
                ['field2', effect_1.SchemaAST.booleanKeyword],
            ]);
            return [2 /*return*/];
        });
    }); });
    (0, vitest_1.test)('addColumns', function () { return __awaiter(void 0, void 0, void 0, function () {
        var TestSchema, registered;
        return __generator(this, function (_a) {
            TestSchema = /** @class */ (function (_super) {
                __extends(TestSchema, _super);
                function TestSchema() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return TestSchema;
            }((0, internal_1.TypedObject)({
                typename: 'example.com/type/Test',
                version: '0.1.0',
            })({
                field1: effect_1.Schema.String,
            })));
            registered = (0, testing_1.createEchoSchema)(TestSchema);
            registered.addFields({ field2: effect_1.Schema.Boolean });
            (0, vitest_1.expect)(registered.getProperties().map(function (p) { return [p.name, p.type]; })).to.deep.eq([
                ['field1', effect_1.SchemaAST.stringKeyword],
                ['field2', effect_1.SchemaAST.booleanKeyword],
            ]);
            return [2 /*return*/];
        });
    }); });
    (0, vitest_1.test)('updateColumns preserves order of existing and appends new fields', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registered;
        return __generator(this, function (_a) {
            registered = (0, testing_1.createEchoSchema)(EmptySchemaType);
            registered.addFields({ field1: effect_1.Schema.String });
            registered.addFields({ field2: effect_1.Schema.Boolean });
            registered.addFields({ field3: effect_1.Schema.Number });
            registered.updateFields({ field4: effect_1.Schema.Boolean, field2: effect_1.Schema.String });
            (0, vitest_1.expect)(registered.getProperties().map(function (p) { return [p.name, p.type]; })).to.deep.eq([
                ['field1', effect_1.SchemaAST.stringKeyword],
                ['field2', effect_1.SchemaAST.stringKeyword],
                ['field3', effect_1.SchemaAST.numberKeyword],
                ['field4', effect_1.SchemaAST.booleanKeyword],
            ]);
            return [2 /*return*/];
        });
    }); });
    (0, vitest_1.test)('removeColumns', function () { return __awaiter(void 0, void 0, void 0, function () {
        var registered;
        return __generator(this, function (_a) {
            registered = (0, testing_1.createEchoSchema)(EmptySchemaType);
            registered.addFields({ field1: effect_1.Schema.String });
            registered.addFields({ field2: effect_1.Schema.Boolean });
            registered.addFields({ field3: effect_1.Schema.Number });
            registered.removeFields(['field2']);
            (0, vitest_1.expect)(registered.getProperties().map(function (p) { return [p.name, p.type]; })).to.deep.eq([
                ['field1', effect_1.SchemaAST.stringKeyword],
                ['field3', effect_1.SchemaAST.numberKeyword],
            ]);
            return [2 /*return*/];
        });
    }); });
    (0, vitest_1.test)('schema manipulations preserve annotations', function () { return __awaiter(void 0, void 0, void 0, function () {
        var metaNamespace, metaInfo, registered;
        return __generator(this, function (_a) {
            metaNamespace = 'dxos.test';
            metaInfo = { maxLength: 10 };
            registered = (0, testing_1.createEchoSchema)(EmptySchemaType);
            registered.addFields({
                field1: effect_1.Schema.String.pipe((0, internal_1.PropertyMeta)(metaNamespace, metaInfo)),
                field2: effect_1.Schema.String,
            });
            registered.addFields({ field3: effect_1.Schema.String });
            registered.updateFields({ field3: effect_1.Schema.Boolean });
            registered.removeFields(['field2']);
            (0, vitest_1.expect)((0, internal_1.getTypeAnnotation)(registered)).to.deep.contain({
                typename: 'example.com/type/Empty',
                version: '0.1.0',
            });
            (0, vitest_1.expect)((0, internal_1.getPropertyMetaAnnotation)(registered.getProperties()[0], metaNamespace)).to.deep.eq(metaInfo);
            return [2 /*return*/];
        });
    }); });
    (0, vitest_1.test)('updates typename', function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var registered, originalVersion, newTypename1, properties, nameMeta, newTypename2;
        var expect = _b.expect;
        return __generator(this, function (_c) {
            registered = (0, testing_1.createEchoSchema)(EmptySchemaType);
            originalVersion = registered.storedSchema.version;
            registered.addFields({
                name: effect_1.Schema.String.pipe((0, internal_1.PropertyMeta)('test', { maxLength: 10 })),
                age: effect_1.Schema.Number,
            });
            newTypename1 = 'example.com/type/Individual';
            registered.updateTypename(newTypename1);
            // Basic typename update checks.
            expect(registered.typename).toBe(newTypename1);
            expect(registered.jsonSchema.$id).toBe("dxn:type:".concat(newTypename1));
            expect(registered.jsonSchema.typename).toBe(newTypename1);
            // Version preservation check.
            expect(registered.storedSchema.version).toBe(originalVersion);
            properties = registered.getProperties();
            expect(properties).toHaveLength(2);
            expect(properties[0].name).toBe('name');
            nameMeta = (0, internal_1.getPropertyMetaAnnotation)(properties[0], 'test');
            expect(nameMeta).toEqual({ maxLength: 10 });
            newTypename2 = 'example.com/type/Person';
            registered.updateTypename(newTypename2);
            expect(registered.typename).toBe(newTypename2);
            expect(registered.jsonSchema.$id).toBe("dxn:type:".concat(newTypename2));
            expect(registered.jsonSchema.typename).toBe(newTypename2);
            expect((0, internal_1.getTypeAnnotation)(registered)).to.deep.contain({
                typename: 'example.com/type/Person',
                version: '0.1.0',
            });
            return [2 /*return*/];
        });
    }); });
});
