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
Object.defineProperty(exports, "__esModule", { value: true });
exports.live = void 0;
var internal_1 = require("../internal");
var internal_2 = require("../internal");
var proxy_1 = require("./proxy");
var typed_handler_1 = require("./typed-handler");
var untyped_handler_1 = require("./untyped-handler");
/**
 * Creates a reactive object from a plain Javascript object.
 * Optionally provides a TS-effect schema.
 */
// TODO(dmaretskyi): Deep mutability.
// TODO(dmaretskyi): Invert generics (generic over schema) to have better error messages.
// TODO(dmaretskyi): Could mutate original object making it unusable.
// TODO(burdon): Use Schema.make() to handle defaults?
var live = function (objOrSchema, obj, meta) {
    // TODO(dmaretskyi): Remove Expando special case.
    if (obj && objOrSchema !== internal_1.Expando) {
        return createReactiveObject(__assign({}, obj), meta, objOrSchema);
    }
    else if (obj && objOrSchema === internal_1.Expando) {
        return createReactiveObject(__assign({}, obj), meta, undefined, { expando: true });
    }
    else {
        return createReactiveObject(objOrSchema, meta);
    }
};
exports.live = live;
var createReactiveObject = function (obj, meta, schema, options) {
    if (!(0, proxy_1.isValidProxyTarget)(obj)) {
        throw new Error('Value cannot be made into a reactive object.');
    }
    if (schema) {
        var annotation = (0, internal_1.getTypeAnnotation)(schema);
        var shouldGenerateId = (options === null || options === void 0 ? void 0 : options.expando) || !!annotation;
        if (shouldGenerateId) {
            setIdOnTarget(obj);
        }
        if (annotation) {
            (0, internal_1.defineHiddenProperty)(obj, internal_1.EntityKindId, annotation.kind);
        }
        initMeta(obj, meta);
        (0, typed_handler_1.prepareTypedTarget)(obj, schema);
        (0, internal_1.attachTypedJsonSerializer)(obj);
        return (0, proxy_1.createProxy)(obj, typed_handler_1.TypedReactiveHandler.instance);
    }
    else {
        if (options === null || options === void 0 ? void 0 : options.expando) {
            setIdOnTarget(obj);
        }
        initMeta(obj, meta);
        return (0, proxy_1.createProxy)(obj, untyped_handler_1.UntypedReactiveHandler.instance);
    }
};
/**
 * Set ID on ECHO object targets during creation.
 * Used for objects with schema and the ones explicitly marked as Expando.
 */
var setIdOnTarget = function (target) {
    // invariant(!('id' in target), 'Object already has an `id` field, which is reserved.');
    if ('id' in target) {
        if (!internal_1.ObjectId.isValid(target.id)) {
            throw new Error('Invalid object id format.');
        }
    }
    else {
        target.id = internal_1.ObjectId.random();
    }
};
/**
 * Set metadata on object.
 */
// TODO(dmaretskyi): Move to echo-schema.
var initMeta = function (obj, meta) {
    if (meta === void 0) { meta = { keys: [] }; }
    (0, typed_handler_1.prepareTypedTarget)(meta, internal_1.ObjectMetaSchema);
    (0, internal_1.defineHiddenProperty)(obj, internal_2.MetaId, (0, proxy_1.createProxy)(meta, typed_handler_1.TypedReactiveHandler.instance));
};
