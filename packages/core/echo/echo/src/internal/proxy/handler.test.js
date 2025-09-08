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
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
Object.defineProperty(exports, "__esModule", { value: true });
var node_util_1 = require("node:util");
var vitest_1 = require("vitest");
var internal_1 = require("@dxos/echo/internal");
var testing_1 = require("@dxos/echo-schema/testing");
var echo_signals_1 = require("@dxos/echo-signals");
var util_1 = require("@dxos/util");
var live_object_1 = require("@dxos/live-object");
var live_object_2 = require("@dxos/live-object");
(0, echo_signals_1.registerSignalsRuntime)();
var TEST_OBJECT = {
    string: 'foo',
    number: 42,
    boolean: true,
    null: null,
    stringArray: ['1', '2', '3'],
    object: { field: 'bar' },
};
var _loop_1 = function (schema) {
    var createObject = function (props) {
        if (props === void 0) { props = {}; }
        return schema == null ? (0, live_object_1.live)(props) : (0, live_object_1.live)(schema, props);
    };
    (0, vitest_1.describe)("Non-echo specific proxy properties".concat(schema == null ? '' : ' with schema'), function () {
        vitest_1.test.skipIf(!(0, util_1.isNode)())('inspect', function () {
            var obj = createObject({ string: 'bar' });
            var str = (0, node_util_1.inspect)(obj, { colors: false });
            (0, vitest_1.expect)(str).to.eq("".concat(schema == null ? '' : 'Typed ', "{ string: 'bar' }"));
        });
        (0, vitest_1.test)('data symbol', function () { return __awaiter(void 0, void 0, void 0, function () {
            var obj, objData;
            return __generator(this, function (_a) {
                obj = createObject(__assign({}, TEST_OBJECT));
                objData = obj[live_object_2.objectData];
                (0, vitest_1.expect)(objData).to.deep.contain(__assign({ '@type': "".concat(schema ? 'Typed' : '', "ReactiveObject") }, TEST_OBJECT));
                return [2 /*return*/];
            });
        }); });
        (0, vitest_1.test)('can assign class instances', function () {
            var obj = createObject();
            var classInstance = new testing_1.Testing.TestClass();
            obj.classInstance = classInstance;
            (0, vitest_1.expect)(obj.classInstance.field).to.eq('value');
            (0, vitest_1.expect)(obj.classInstance instanceof testing_1.Testing.TestClass).to.eq(true);
            (0, vitest_1.expect)(obj.classInstance === classInstance).to.be.true;
            obj.classInstance.field = 'baz';
            (0, vitest_1.expect)(obj.classInstance.field).to.eq('baz');
        });
        (0, vitest_1.describe)('class instance equality', function () {
            (0, vitest_1.test)('toJSON', function () {
                var _a;
                var original = { classInstance: new testing_1.Testing.TestClass() };
                var reactive = createObject(original);
                if (!schema) {
                    (0, vitest_1.expect)(JSON.stringify(reactive)).to.eq(JSON.stringify(original));
                }
                else {
                    (0, vitest_1.expect)(JSON.stringify(reactive)).to.eq(JSON.stringify(__assign((_a = {}, _a[internal_1.ATTR_META] = {
                        keys: [],
                    }, _a), original)));
                }
            });
            (0, vitest_1.test)('chai deep equal works', function () {
                var original = { classInstance: new testing_1.Testing.TestClass() };
                var reactive = createObject(original);
                (0, vitest_1.expect)(reactive).to.deep.eq(original);
                (0, vitest_1.expect)(reactive).to.not.deep.eq(__assign(__assign({}, original), { number: 11 }));
            });
            (0, vitest_1.test)('jest deep equal works', function () {
                var original = { classInstance: new testing_1.Testing.TestClass() };
                var reactive = createObject(original);
                (0, vitest_1.expect)(reactive).toEqual(original);
                (0, vitest_1.expect)(reactive).not.toEqual(__assign(__assign({}, original), { number: 11 }));
            });
        });
        (0, vitest_1.describe)('signal updates', function () {
            (0, vitest_1.test)('not in nested class instances', function () {
                var env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    var obj = createObject({ classInstance: new testing_1.Testing.TestClass() });
                    var updates = __addDisposableResource(env_1, (0, testing_1.updateCounter)(function () {
                        obj.classInstance.field;
                    }), false);
                    (0, vitest_1.expect)(updates.count, 'update count').to.eq(0);
                    obj.classInstance.field = 'baz';
                    (0, vitest_1.expect)(updates.count, 'update count').to.eq(0);
                }
                catch (e_1) {
                    env_1.error = e_1;
                    env_1.hasError = true;
                }
                finally {
                    __disposeResources(env_1);
                }
            });
        });
    });
};
for (var _i = 0, _a = [undefined, testing_1.Testing.TestSchemaWithClass]; _i < _a.length; _i++) {
    var schema = _a[_i];
    _loop_1(schema);
}
(0, vitest_1.describe)('getters', function () {
    (0, vitest_1.test)('add getter to object', function () {
        var value = 'foo';
        var obj = (0, live_object_1.live)({
            get getter() {
                return value;
            },
        });
        (0, vitest_1.expect)(obj.getter).to.eq('foo');
        value = 'bar';
        (0, vitest_1.expect)(obj.getter).to.eq('bar');
    });
    (0, vitest_1.test)('signal updates', function () {
        var env_2 = { stack: [], error: void 0, hasError: false };
        try {
            var innerObj = (0, live_object_1.live)({
                string: 'bar',
            });
            var obj = (0, live_object_1.live)({
                field: 1,
                get getter() {
                    return innerObj.string;
                },
            });
            var updates = __addDisposableResource(env_2, (0, testing_1.updateCounter)(function () {
                var value = obj.getter;
                (0, vitest_1.expect)(value).to.exist;
            }), false);
            innerObj.string = 'baz';
            (0, vitest_1.expect)(obj.getter).to.eq('baz');
            (0, vitest_1.expect)(updates.count, 'update count').to.eq(1);
            obj.field = 2;
            (0, vitest_1.expect)(updates.count, 'update count').to.eq(1);
        }
        catch (e_2) {
            env_2.error = e_2;
            env_2.hasError = true;
        }
        finally {
            __disposeResources(env_2);
        }
    });
    (0, vitest_1.test)('getter for array', function () {
        var value = [1];
        var obj = (0, live_object_1.live)({
            get getter() {
                return value;
            },
        });
        (0, vitest_1.expect)(obj.getter).to.have.length(1);
        value.push(2);
        (0, vitest_1.expect)(obj.getter).to.have.length(2);
    });
});
