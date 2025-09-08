"use strict";
//
// Copyright 2024 DXOS.org
//
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareTypedTarget = exports.TypedReactiveHandler = void 0;
var effect_1 = require("effect");
var debug_1 = require("@dxos/debug");
var internal_1 = require("@dxos/echo/internal");
var runtime_1 = require("@dxos/echo-signals/runtime");
var invariant_1 = require("@dxos/invariant");
var proxy_1 = require("./proxy");
var symbolSignal = Symbol('signal');
var symbolPropertySignal = Symbol('property-signal');
/**
 * Typed in-memory reactive store (with Schema).
 */
var TypedReactiveHandler = /** @class */ (function () {
    function TypedReactiveHandler() {
        this._proxyMap = new WeakMap();
    }
    TypedReactiveHandler.prototype.init = function (target) {
        (0, invariant_1.invariant)(typeof target === 'object' && target !== null);
        (0, invariant_1.invariant)(internal_1.SchemaId in target, 'Schema is not defined for the target');
        if (!(symbolSignal in target)) {
            (0, internal_1.defineHiddenProperty)(target, symbolSignal, runtime_1.compositeRuntime.createSignal());
            (0, internal_1.defineHiddenProperty)(target, symbolPropertySignal, runtime_1.compositeRuntime.createSignal());
        }
        (0, internal_1.defineHiddenProperty)(target, internal_1.DeletedId, false);
        for (var _i = 0, _a = Object.getOwnPropertyNames(target); _i < _a.length; _i++) {
            var key = _a[_i];
            var descriptor = Object.getOwnPropertyDescriptor(target, key);
            if (descriptor.get) {
                // Ignore getters.
                continue;
            }
            // Array reactivity is already handled by the schema validator.
        }
        // Maybe have been set by `create`.
        Object.defineProperty(target, debug_1.inspectCustom, {
            enumerable: false,
            configurable: true,
            value: this._inspect.bind(target),
        });
    };
    TypedReactiveHandler.prototype.get = function (target, prop, receiver) {
        var _a;
        switch (prop) {
            case proxy_1.objectData: {
                target[symbolSignal].notifyRead();
                return toJSON(target);
            }
        }
        // Handle getter properties. Will not subscribe the value signal.
        if ((_a = Object.getOwnPropertyDescriptor(target, prop)) === null || _a === void 0 ? void 0 : _a.get) {
            target[symbolPropertySignal].notifyRead();
            // TODO(dmaretskyi): Turn getters into computed fields.
            return Reflect.get(target, prop, receiver);
        }
        target[symbolSignal].notifyRead();
        target[symbolPropertySignal].notifyRead();
        var value = Reflect.get(target, prop, receiver);
        if ((0, proxy_1.isValidProxyTarget)(value)) {
            return (0, proxy_1.createProxy)(value, this);
        }
        return value;
    };
    TypedReactiveHandler.prototype.set = function (target, prop, value, receiver) {
        var _this = this;
        // Convert arrays to reactive arrays on write.
        if (Array.isArray(value)) {
            value = proxy_1.ReactiveArray.from(value);
        }
        var result = false;
        runtime_1.compositeRuntime.batch(function () {
            var validatedValue = _this._validateValue(target, prop, value);
            result = Reflect.set(target, prop, validatedValue, receiver);
            target[symbolSignal].notifyWrite();
        });
        return result;
    };
    TypedReactiveHandler.prototype.ownKeys = function (target) {
        // Touch both signals since `set` and `delete` operations may create or remove properties.
        target[symbolSignal].notifyRead();
        target[symbolPropertySignal].notifyRead();
        return Reflect.ownKeys(target);
    };
    TypedReactiveHandler.prototype.defineProperty = function (target, property, attributes) {
        var validatedValue = this._validateValue(target, property, attributes.value);
        var result = Reflect.defineProperty(target, property, __assign(__assign({}, attributes), { value: validatedValue }));
        target[symbolPropertySignal].notifyWrite();
        return result;
    };
    TypedReactiveHandler.prototype._validateValue = function (target, prop, value) {
        var schema = internal_1.SchemaValidator.getTargetPropertySchema(target, prop);
        var _ = effect_1.Schema.asserts(schema)(value);
        if (Array.isArray(value)) {
            value = new (proxy_1.ReactiveArray.bind.apply(proxy_1.ReactiveArray, __spreadArray([void 0], value, false)))();
        }
        if ((0, proxy_1.isValidProxyTarget)(value)) {
            setSchemaProperties(value, schema);
        }
        return value;
    };
    TypedReactiveHandler.prototype._inspect = function (_, options, inspectFn) {
        return "Typed ".concat(inspectFn(this, __assign(__assign({}, options), { compact: true, showHidden: false, customInspect: false })));
    };
    TypedReactiveHandler.instance = new TypedReactiveHandler();
    return TypedReactiveHandler;
}());
exports.TypedReactiveHandler = TypedReactiveHandler;
/**
 * @deprecated Use `Obj.toJSON` instead.
 */
var toJSON = function (target) {
    return __assign({ '@type': 'TypedReactiveObject' }, target);
};
/**
 * Recursively set AST on all potential proxy targets.
 */
var setSchemaProperties = function (obj, schema) {
    var schemaType = (0, internal_1.getSchemaDXN)(schema);
    if (schemaType != null) {
        (0, internal_1.defineHiddenProperty)(obj, internal_1.TypeId, schemaType);
    }
    (0, internal_1.defineHiddenProperty)(obj, internal_1.SchemaId, schema);
    for (var key in obj) {
        if ((0, proxy_1.isValidProxyTarget)(obj[key])) {
            var elementSchema = internal_1.SchemaValidator.getTargetPropertySchema(obj, key);
            if (elementSchema != null) {
                setSchemaProperties(obj[key], elementSchema);
            }
        }
    }
};
var prepareTypedTarget = function (target, schema) {
    // log.info('prepareTypedTarget', { target, schema });
    if (!effect_1.SchemaAST.isTypeLiteral(schema.ast)) {
        throw new Error('schema has to describe an object type');
    }
    internal_1.SchemaValidator.validateSchema(schema);
    var _ = effect_1.Schema.asserts(schema)(target);
    makeArraysReactive(target);
    setSchemaProperties(target, schema);
};
exports.prepareTypedTarget = prepareTypedTarget;
var makeArraysReactive = function (target) {
    for (var key in target) {
        if (target[proxy_1.symbolIsProxy]) {
            continue;
        }
        if (Array.isArray(target[key])) {
            target[key] = proxy_1.ReactiveArray.from(target[key]);
        }
        if (typeof target[key] === 'object') {
            makeArraysReactive(target[key]);
        }
    }
};
