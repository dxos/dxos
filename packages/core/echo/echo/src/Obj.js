"use strict";
//
// Copyright 2025 DXOS.org
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clone = exports.fromJSON = exports.toJSON = exports.setLabel = exports.getLabel = exports.isDeleted = exports.getMeta = exports.getTypename = exports.getTypeDXN = exports.getDXN = exports.getSchema = exports.instanceOf = exports.isObject = exports.make = void 0;
var effect_1 = require("effect");
var EchoSchema = require("@dxos/echo/internal");
var invariant_1 = require("@dxos/invariant");
var live_object_1 = require("@dxos/live-object");
var util_1 = require("@dxos/util");
/**
 * Creates new object.
 */
// TODO(dmaretskyi): Move meta into props.
var make = function (schema, props, meta) {
    var _a;
    (0, invariant_1.assertArgument)(((_a = EchoSchema.getTypeAnnotation(schema)) === null || _a === void 0 ? void 0 : _a.kind) === EchoSchema.EntityKind.Object, 'Expected an object schema');
    if (props[EchoSchema.MetaId] != null) {
        meta = props[EchoSchema.MetaId];
        delete props[EchoSchema.MetaId];
    }
    return (0, live_object_1.live)(schema, props, meta);
};
exports.make = make;
var isObject = function (obj) {
    (0, util_1.assumeType)(obj);
    return typeof obj === 'object' && obj !== null && obj[EchoSchema.EntityKindId] === EchoSchema.EntityKind.Object;
};
exports.isObject = isObject;
/**
 * Test if object or relation is an instance of a schema.
 * @example
 * ```ts
 * const john = Obj.make(Person, { name: 'John' });
 * const johnIsPerson = Obj.instanceOf(Person)(john);
 *
 * const isPerson = Obj.instanceOf(Person);
 * if(isPerson(john)) {
 *   // john is Person
 * }
 * ```
 */
exports.instanceOf = (function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (args.length === 1) {
        return function (obj) { return EchoSchema.isInstanceOf(args[0], obj); };
    }
    return EchoSchema.isInstanceOf(args[0], args[1]);
});
exports.getSchema = EchoSchema.getSchema;
// TODO(dmaretskyi): Allow returning undefined.
var getDXN = function (obj) {
    (0, invariant_1.assertArgument)(!effect_1.Schema.isSchema(obj), 'Object should not be a schema.');
    var dxn = EchoSchema.getObjectDXN(obj);
    (0, invariant_1.invariant)(dxn != null, 'Invalid object.');
    return dxn;
};
exports.getDXN = getDXN;
/**
 * @returns The DXN of the object's type.
 * @example dxn:example.com/type/Contact:1.0.0
 */
// TODO(burdon): Expando does not have a type.
exports.getTypeDXN = EchoSchema.getType;
/**
 * @returns The typename of the object's type.
 * @example `example.com/type/Contact`
 */
var getTypename = function (obj) {
    var _a, _b;
    var schema = (0, exports.getSchema)(obj);
    if (schema == null) {
        // Try to extract typename from DXN.
        return (_b = (_a = EchoSchema.getType(obj)) === null || _a === void 0 ? void 0 : _a.asTypeDXN()) === null || _b === void 0 ? void 0 : _b.type;
    }
    return EchoSchema.getSchemaTypename(schema);
};
exports.getTypename = getTypename;
// TODO(dmaretskyi): Allow returning undefined.
var getMeta = function (obj) {
    var meta = EchoSchema.getMeta(obj);
    (0, invariant_1.invariant)(meta != null, 'Invalid object.');
    return meta;
};
exports.getMeta = getMeta;
// TODO(dmaretskyi): Default to `false`.
var isDeleted = function (obj) {
    var deleted = EchoSchema.isDeleted(obj);
    (0, invariant_1.invariant)(typeof deleted === 'boolean', 'Invalid object.');
    return deleted;
};
exports.isDeleted = isDeleted;
// TODO(burdon): Rename "label"
var getLabel = function (obj) {
    var schema = (0, exports.getSchema)(obj);
    if (schema != null) {
        return EchoSchema.getLabel(schema, obj);
    }
};
exports.getLabel = getLabel;
var setLabel = function (obj, label) {
    var schema = (0, exports.getSchema)(obj);
    if (schema != null) {
        EchoSchema.setLabel(schema, obj, label);
    }
};
exports.setLabel = setLabel;
/**
 * Converts object to its JSON representation.
 *
 * The same algorithm is used when calling the standard `JSON.stringify(obj)` function.
 */
// TODO(burdon): Base util type for Obj/Relation?
var toJSON = function (obj) { return EchoSchema.objectToJSON(obj); };
exports.toJSON = toJSON;
/**
 * Creates an object from its json representation, performing schema validation.
 * References and schemas will be resolvable if the `refResolver` is provided.
 *
 * The function need to be async to support resolving the schema as well as the relation endpoints.
 *
 * @param options.refResolver - Resolver for references. Produces hydrated references that can be resolved.
 * @param options.dxn - Override object DXN. Changes the result of `Obj.getDXN`.
 */
exports.fromJSON = EchoSchema.objectFromJSON;
/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
var clone = function (obj, opts) {
    var id = obj.id, data = __rest(obj, ["id"]);
    var schema = (0, exports.getSchema)(obj);
    (0, invariant_1.invariant)(schema != null, 'Object should have a schema');
    var props = __assign({}, data);
    if (opts === null || opts === void 0 ? void 0 : opts.retainId) {
        props.id = id;
    }
    return (0, exports.make)(schema, props);
};
exports.clone = clone;
