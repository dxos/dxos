"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationTargetId = exports.RelationSourceId = exports.ATTR_RELATION_TARGET = exports.RelationTargetDXNId = exports.ATTR_RELATION_SOURCE = exports.RelationSourceDXNId = exports.ATTR_META = exports.MetaId = exports.ATTR_DELETED = exports.DeletedId = exports.SchemaId = exports.ATTR_TYPE = exports.TypeId = exports.ATTR_SELF_DXN = exports.SelfDXNId = exports.EntityKindId = void 0;
exports.assertObjectModelShape = assertObjectModelShape;
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var util_1 = require("@dxos/util");
var ast_1 = require("../ast");
//
// Defines the internal model of the echo object.
//
/**
 * Entity kind.
 */
exports.EntityKindId = Symbol('@dxos/echo/EntityKind');
/**
 * DXN to the object itself.
 */
exports.SelfDXNId = Symbol('@dxos/echo/DXN');
/**
 * Property name for self DXN when object is serialized to JSON.
 */
exports.ATTR_SELF_DXN = '@dxn';
/**
 * DXN to the object type.
 */
exports.TypeId = Symbol('@dxos/echo/Type');
/**
 * Property name for typename when object is serialized to JSON.
 */
exports.ATTR_TYPE = '@type';
/**
 * Reference to the object schema.
 */
exports.SchemaId = Symbol('@dxos/echo/Schema');
/**
 * Deletion marker.
 */
exports.DeletedId = Symbol('@dxos/echo/Deleted');
/**
 * Property name for deleted when object is serialized to JSON.
 */
exports.ATTR_DELETED = '@deleted';
/**
 * Metadata section.
 */
exports.MetaId = Symbol('@dxos/echo/Meta');
/**
 * Property name for meta when object is serialized to JSON.
 */
exports.ATTR_META = '@meta';
/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
exports.RelationSourceDXNId = Symbol('@dxos/echo/RelationSourceDXN');
/**
 * Property name for relation source when object is serialized to JSON.
 */
exports.ATTR_RELATION_SOURCE = '@relationSource';
/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
exports.RelationTargetDXNId = Symbol('@dxos/echo/RelationTargetDXN');
/**
 * Property name for relation target when object is serialized to JSON.
 */
exports.ATTR_RELATION_TARGET = '@relationTarget';
/**
 * Used to access relation source ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
exports.RelationSourceId = Symbol('@dxos/echo/RelationSource');
/**
 * Used to access relation target ref on live ECHO objects.
 * Reading this symbol must return `Live<EchoObject<any>>` or a DXN.
 */
exports.RelationTargetId = Symbol('@dxos/echo/RelationTarget');
// NOTE: Keep as `function` to avoid type inference issues.
// eslint-disable-next-line prefer-arrow-functions/prefer-arrow-functions
function assertObjectModelShape(obj) {
    (0, invariant_1.invariant)(typeof obj === 'object' && obj !== null, 'Invalid object model: not an object');
    (0, util_1.assumeType)(obj);
    (0, invariant_1.invariant)(keys_1.ObjectId.isValid(obj.id), 'Invalid object model: invalid id');
    (0, invariant_1.invariant)(obj[exports.TypeId] === undefined || obj[exports.TypeId] instanceof keys_1.DXN, 'Invalid object model: invalid type');
    (0, invariant_1.invariant)(obj[exports.EntityKindId] === ast_1.EntityKind.Object || obj[exports.EntityKindId] === ast_1.EntityKind.Relation, 'Invalid object model: invalid entity kind');
    if (obj[exports.EntityKindId] === ast_1.EntityKind.Relation) {
        (0, invariant_1.invariant)(obj[exports.RelationSourceDXNId] instanceof keys_1.DXN, 'Invalid object model: invalid relation source');
        (0, invariant_1.invariant)(obj[exports.RelationTargetDXNId] instanceof keys_1.DXN, 'Invalid object model: invalid relation target');
        (0, invariant_1.invariant)(!(obj[exports.RelationSourceId] instanceof keys_1.DXN), 'Invalid object model: source pointer is a DXN');
        (0, invariant_1.invariant)(!(obj[exports.RelationTargetId] instanceof keys_1.DXN), 'Invalid object model: target pointer is a DXN');
    }
}
