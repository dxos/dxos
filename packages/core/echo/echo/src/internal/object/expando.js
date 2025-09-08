"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expando = exports.EXPANDO_TYPENAME = void 0;
var effect_1 = require("effect");
var entity_1 = require("./entity");
exports.EXPANDO_TYPENAME = 'dxos.org/type/Expando';
var ExpandoSchema = effect_1.Schema.Struct({}, { key: effect_1.Schema.String, value: effect_1.Schema.Any }).pipe((0, entity_1.EchoObject)({ typename: exports.EXPANDO_TYPENAME, version: '0.1.0' }));
exports.Expando = ExpandoSchema;
