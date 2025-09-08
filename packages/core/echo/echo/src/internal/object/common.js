"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeTypedEntityClass = void 0;
var effect_1 = require("effect");
var typename_1 = require("./typename");
var makeTypedEntityClass = function (typename, version, baseSchema) {
    var _a, _b;
    return _b = /** @class */ (function () {
            // TODO(burdon): Throw APIError.
            function class_1() {
                throw new Error('Use live(Typename, { ...fields }) to instantiate an object.');
            }
            // TODO(burdon): Comment required.
            class_1[(_a = effect_1.Schema.TypeId, Symbol.hasInstance)] = function (obj) {
                return obj != null && (0, typename_1.getTypename)(obj) === typename;
            };
            return class_1;
        }()),
        // Implement TypedObject properties.
        _b.typename = typename,
        _b.version = version,
        // Implement Schema.Schema properties.
        // TODO(burdon): Comment required.
        _b[_a] = schemaVariance,
        _b.ast = baseSchema.ast,
        _b.annotations = baseSchema.annotations.bind(baseSchema),
        _b.pipe = baseSchema.pipe.bind(baseSchema),
        _b;
};
exports.makeTypedEntityClass = makeTypedEntityClass;
var schemaVariance = {
    _A: function (_) { return _; },
    _I: function (_) { return _; },
    _R: function (_) { return _; },
};
