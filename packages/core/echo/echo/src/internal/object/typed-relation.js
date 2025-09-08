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
exports.TypedRelation = void 0;
var effect_1 = require("effect");
var invariant_1 = require("@dxos/invariant");
var ast_1 = require("../ast");
var common_1 = require("./common");
/**
 * Base class factory for typed objects.
 * @deprecated Use {@link EchoRelation} instead.
 */
var TypedRelation = function (_a) {
    var _typename = _a.typename, _version = _a.version, disableValidation = _a.disableValidation;
    var typename = ast_1.Typename.make(_typename, { disableValidation: disableValidation });
    var version = ast_1.Version.make(_version, { disableValidation: disableValidation });
    /**
     * Return class definition factory.
     */
    return function (fields, options) {
        var _a;
        // Create schema from fields.
        var schema = (options === null || options === void 0 ? void 0 : options.record)
            ? effect_1.Schema.Struct(fields, { key: effect_1.Schema.String, value: effect_1.Schema.Any })
            : effect_1.Schema.Struct(fields);
        // Set ECHO object id property.
        var typeSchema = effect_1.Schema.extend(effect_1.Schema.mutable((options === null || options === void 0 ? void 0 : options.partial) ? effect_1.Schema.partial(schema) : schema), effect_1.Schema.Struct({ id: effect_1.Schema.String }));
        // Set ECHO annotations.
        (0, invariant_1.invariant)(typeof ast_1.EntityKind.Relation === 'string');
        var annotatedSchema = typeSchema.annotations((_a = {},
            _a[ast_1.TypeAnnotationId] = { kind: ast_1.EntityKind.Relation, typename: typename, version: version },
            _a));
        /**
         * Return class definition.
         * NOTE: Actual reactive ECHO objects must be created via the `live(Type)` function.
         */
        // TODO(burdon): This is missing fields required by TypedRelation (e.g., Type, Encoded, Context)?
        return /** @class */ (function (_super) {
            __extends(TypedRelation, _super);
            function TypedRelation() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            return TypedRelation;
        }((0, common_1.makeTypedEntityClass)(typename, version, annotatedSchema)));
    };
};
exports.TypedRelation = TypedRelation;
