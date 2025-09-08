"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.toJsonSchema = exports.toEffectSchema = exports.JsonSchema = exports.Format = exports.DXN = exports.ObjectId = exports.SpaceId = exports.getMeta = exports.isMutable = exports.getVersion = exports.getTypename = exports.getDXN = exports.Ref = exports.Relation = exports.Expando = exports.Obj = exports.Kind = exports.KindId = void 0;
var EchoSchema = require("@dxos/echo/internal");
var invariant_1 = require("@dxos/invariant");
//
// Kind
//
exports.KindId = EchoSchema.EntityKindId;
exports.Kind = EchoSchema.EntityKind;
/**
 * Object schema.
 */
exports.Obj = EchoSchema.EchoObject;
exports.Expando = EchoSchema.Expando;
/**
 * Relation schema.
 */
// TODO(dmaretskyi): I have to redefine the type here so that the definition uses symbols from @dxos/echo/Relation.
exports.Relation = EchoSchema.EchoRelation;
/**
 * Ref schema.
 */
exports.Ref = EchoSchema.Ref;
/**
 * Gets the full DXN of the schema.
 * Will include the version if it's a `type` DXN.
 * @example "dxn:example.com/type/Person:0.1.0"
 * @example "dxn:echo:SSSSSSSSSS:XXXXXXXXXXXXX"
 */
var getDXN = function (schema) {
    return EchoSchema.getSchemaDXN(schema);
};
exports.getDXN = getDXN;
/**
 * @param schema - Schema to get the typename from.
 * @returns The typename of the schema. Example: `example.com/type/Person`.
 */
var getTypename = function (schema) {
    var typename = EchoSchema.getSchemaTypename(schema);
    (0, invariant_1.invariant)(typeof typename === 'string' && !typename.startsWith('dxn:'), 'Invalid typename');
    return typename;
};
exports.getTypename = getTypename;
/**
 * Gets the version of the schema.
 * @example 0.1.0
 */
var getVersion = function (schema) {
    var version = EchoSchema.getSchemaVersion(schema);
    (0, invariant_1.invariant)(typeof version === 'string' && version.match(/^\d+\.\d+\.\d+$/), 'Invalid version');
    return version;
};
exports.getVersion = getVersion;
/**
 * @returns True if the schema is mutable.
 */
exports.isMutable = EchoSchema.isMutable;
/**
 * Gets the meta data of the schema.
 */
var getMeta = function (schema) {
    return EchoSchema.getTypeAnnotation(schema);
};
exports.getMeta = getMeta;
// TODO(dmaretskyi): Remove re-exports.
var keys_1 = require("@dxos/keys");
Object.defineProperty(exports, "SpaceId", { enumerable: true, get: function () { return keys_1.SpaceId; } });
Object.defineProperty(exports, "ObjectId", { enumerable: true, get: function () { return keys_1.ObjectId; } });
Object.defineProperty(exports, "DXN", { enumerable: true, get: function () { return keys_1.DXN; } });
var internal_1 = require("@dxos/echo/internal");
Object.defineProperty(exports, "Format", { enumerable: true, get: function () { return internal_1.Format; } });
Object.defineProperty(exports, "JsonSchema", { enumerable: true, get: function () { return internal_1.JsonSchemaType; } });
Object.defineProperty(exports, "toEffectSchema", { enumerable: true, get: function () { return internal_1.toEffectSchema; } });
Object.defineProperty(exports, "toJsonSchema", { enumerable: true, get: function () { return internal_1.toJsonSchema; } });
