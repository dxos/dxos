"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityKindSchema = exports.EntityKind = void 0;
var effect_1 = require("effect");
/**
 * Kinds of entities stored in ECHO: objects and relations.
 */
var EntityKind;
(function (EntityKind) {
    EntityKind["Object"] = "object";
    EntityKind["Relation"] = "relation";
})(EntityKind || (exports.EntityKind = EntityKind = {}));
exports.EntityKindSchema = effect_1.Schema.Enums(EntityKind);
