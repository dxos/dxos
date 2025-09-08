"use strict";
//
// Copyright 2022 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeSchemaRegistry = void 0;
var debug_1 = require("@dxos/debug");
var invariant_1 = require("@dxos/invariant");
var util_1 = require("@dxos/util");
var ast_1 = require("../ast");
var stored_schema_1 = require("./stored-schema");
/**
 * Runtime registry of static schema objects (i.e., not Dynamic .
 */
// TODO(burdon): Reconcile with EchoSchemaRegistry.
var RuntimeSchemaRegistry = /** @class */ (function () {
    function RuntimeSchemaRegistry() {
        this._registry = new Map();
        this._registry.set(stored_schema_1.StoredSchema.typename, [stored_schema_1.StoredSchema]);
    }
    Object.defineProperty(RuntimeSchemaRegistry.prototype, "schemas", {
        get: function () {
            return Array.from(this._registry.values()).flat();
        },
        enumerable: false,
        configurable: true
    });
    RuntimeSchemaRegistry.prototype.hasSchema = function (schema) {
        var _a;
        var typename = (0, ast_1.getSchemaTypename)(schema);
        var version = (0, ast_1.getSchemaVersion)(schema);
        (0, invariant_1.invariant)(typename);
        var schemas = this._registry.get(typename);
        return (_a = schemas === null || schemas === void 0 ? void 0 : schemas.some(function (schema) { return (0, ast_1.getSchemaVersion)(schema) === version; })) !== null && _a !== void 0 ? _a : false;
    };
    RuntimeSchemaRegistry.prototype.getSchemaByDXN = function (dxn) {
        var _a;
        var components = dxn.asTypeDXN();
        if (!components) {
            return undefined;
        }
        var type = components.type, version = components.version;
        var allSchemas = (_a = this._registry.get(type)) !== null && _a !== void 0 ? _a : [];
        if (version) {
            return allSchemas.find(function (s) { return (0, ast_1.getSchemaVersion)(s) === version; });
        }
        else {
            // If no version is specified, return the earliest version for backwards compatibility.
            // TODO(dmaretskyi): Probably not correct to compare lexicographically, but it's good enough for now.
            return allSchemas.sort(function (a, b) { var _a, _b; return ((_a = (0, ast_1.getSchemaVersion)(a)) !== null && _a !== void 0 ? _a : '0.0.0').localeCompare((_b = (0, ast_1.getSchemaVersion)(b)) !== null && _b !== void 0 ? _b : '0.0.0'); })[0];
        }
    };
    /**
     * @deprecated Use getSchemaByDXN.
     */
    RuntimeSchemaRegistry.prototype.getSchema = function (typename) {
        var _a;
        return (_a = this._registry.get(typename)) === null || _a === void 0 ? void 0 : _a[0];
    };
    RuntimeSchemaRegistry.prototype.addSchema = function (types) {
        var _this = this;
        types.forEach(function (schema) {
            var _a, _b;
            var typename = (_a = (0, ast_1.getSchemaTypename)(schema)) !== null && _a !== void 0 ? _a : (0, debug_1.raise)(new TypeError('Schema has no typename'));
            var version = (_b = (0, ast_1.getSchemaVersion)(schema)) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new TypeError('Schema has no version'));
            var versions = (0, util_1.defaultMap)(_this._registry, typename, function () { return []; });
            if (versions.some(function (schema) { return (0, ast_1.getSchemaVersion)(schema) === version; })) {
                throw new Error("Schema version already registered: ".concat(typename, ":").concat(version));
            }
            versions.push(schema);
        });
    };
    return RuntimeSchemaRegistry;
}());
exports.RuntimeSchemaRegistry = RuntimeSchemaRegistry;
