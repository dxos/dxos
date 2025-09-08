"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTarget = exports.getSource = exports.getTargetDXN = exports.getSourceDXN = exports.isRelation = exports.make = exports.Target = exports.Source = void 0;
var debug_1 = require("@dxos/debug");
var EchoSchema = require("@dxos/echo/internal");
var invariant_1 = require("@dxos/invariant");
var keys_1 = require("@dxos/keys");
var live_object_1 = require("@dxos/live-object");
var util_1 = require("@dxos/util");
// TODO(dmaretskyi): Has to be `unique symbol`.
exports.Source = EchoSchema.RelationSourceId;
exports.Target = EchoSchema.RelationTargetId;
/**
 * Creates new relation.
 * @param schema - Relation schema.
 * @param props - Relation properties. Endpoints are passed as [Relation.Source] and [Relation.Target] keys.
 * @param meta - Relation metadata.
 * @returns
 */
// NOTE: Writing the definition this way (with generic over schema) makes typescript perfer to infer the type from the first param (this schema) rather than the second param (the props).
// TODO(dmaretskyi): Move meta into props.
var make = function (schema, props, meta) {
    var _a, _b, _c;
    (0, invariant_1.assertArgument)(((_a = EchoSchema.getTypeAnnotation(schema)) === null || _a === void 0 ? void 0 : _a.kind) === EchoSchema.EntityKind.Relation, 'Expected a relation schema');
    if (props[EchoSchema.MetaId] != null) {
        meta = props[EchoSchema.MetaId];
        delete props[EchoSchema.MetaId];
    }
    var sourceDXN = (_b = EchoSchema.getObjectDXN(props[exports.Source])) !== null && _b !== void 0 ? _b : (0, debug_1.raise)(new Error('Unresolved relation source'));
    var targetDXN = (_c = EchoSchema.getObjectDXN(props[exports.Target])) !== null && _c !== void 0 ? _c : (0, debug_1.raise)(new Error('Unresolved relation target'));
    props[EchoSchema.RelationSourceDXNId] = sourceDXN;
    props[EchoSchema.RelationTargetDXNId] = targetDXN;
    return (0, live_object_1.live)(schema, props, meta);
};
exports.make = make;
var isRelation = function (value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    if (EchoSchema.ATTR_RELATION_SOURCE in value || EchoSchema.ATTR_RELATION_TARGET in value) {
        return true;
    }
    var kind = value[EchoSchema.EntityKindId];
    return kind === EchoSchema.EntityKind.Relation;
};
exports.isRelation = isRelation;
/**
 * @returns Relation source DXN.
 * @throws If the object is not a relation.
 */
var getSourceDXN = function (value) {
    (0, invariant_1.assertArgument)((0, exports.isRelation)(value), 'Expected a relation');
    (0, util_1.assumeType)(value);
    var dxn = value[EchoSchema.RelationSourceDXNId];
    (0, invariant_1.invariant)(dxn instanceof keys_1.DXN);
    return dxn;
};
exports.getSourceDXN = getSourceDXN;
/**
 * @returns Relation target DXN.
 * @throws If the object is not a relation.
 */
var getTargetDXN = function (value) {
    (0, invariant_1.assertArgument)((0, exports.isRelation)(value), 'Expected a relation');
    (0, util_1.assumeType)(value);
    var dxn = value[EchoSchema.RelationTargetDXNId];
    (0, invariant_1.invariant)(dxn instanceof keys_1.DXN);
    return dxn;
};
exports.getTargetDXN = getTargetDXN;
/**
 * @returns Relation source.
 * @throws If the object is not a relation.
 */
var getSource = function (relation) {
    (0, invariant_1.assertArgument)((0, exports.isRelation)(relation), 'Expected a relation');
    (0, util_1.assumeType)(relation);
    var obj = relation[EchoSchema.RelationSourceId];
    (0, invariant_1.invariant)(obj !== undefined, "Invalid source: ".concat(relation.id));
    return obj;
};
exports.getSource = getSource;
/**
 * @returns Relation target.
 * @throws If the object is not a relation.
 */
var getTarget = function (relation) {
    (0, invariant_1.assertArgument)((0, exports.isRelation)(relation), 'Expected a relation');
    (0, util_1.assumeType)(relation);
    var obj = relation[EchoSchema.RelationTargetId];
    (0, invariant_1.invariant)(obj !== undefined, "Invalid target: ".concat(relation.id));
    return obj;
};
exports.getTarget = getTarget;
