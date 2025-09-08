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
Object.defineProperty(exports, "__esModule", { value: true });
var effect_1 = require("effect");
var vitest_1 = require("vitest");
var ast_1 = require("../ast");
var formats_1 = require("../formats");
var json_1 = require("../json");
var json_schema_1 = require("../json-schema");
var object_1 = require("../object");
var compose_1 = require("./compose");
(0, vitest_1.describe)('schema composition', function () {
    (0, vitest_1.test)('schema composition', function (_a) {
        var _b;
        var expect = _a.expect;
        var BaseType = /** @class */ (function (_super) {
            __extends(BaseType, _super);
            function BaseType() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return BaseType;
        }((0, object_1.TypedObject)({ typename: 'example.com/Person', version: '0.1.0' })({
            name: effect_1.Schema.String,
            email: effect_1.Schema.String,
        })));
        var OverlaySchema = effect_1.Schema.Struct({
            email: effect_1.Schema.String.pipe((0, ast_1.FieldPath)('$.email'), formats_1.FormatAnnotation.set(formats_1.FormatEnum.Email)),
        });
        var baseSchema = (0, json_1.toJsonSchema)(BaseType);
        var overlaySchema = (0, json_1.toJsonSchema)(OverlaySchema);
        var composedSchema = (0, compose_1.composeSchema)(baseSchema, overlaySchema);
        expect(composedSchema.properties).to.deep.eq({
            email: (_b = {
                    type: 'string',
                    format: formats_1.FormatEnum.Email
                },
                // TODO(dmaretskyi): Should use the new field.
                _b[json_schema_1.ECHO_ANNOTATIONS_NS_KEY] = {
                    meta: {
                        path: '$.email',
                    },
                },
                _b),
        });
    });
});
