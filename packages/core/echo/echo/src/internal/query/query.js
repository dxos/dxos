"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryType = exports.FieldSortType = void 0;
var effect_1 = require("effect");
// TODO(ZaymonFC): Where should this live?
var SortDirection = effect_1.Schema.Union(effect_1.Schema.Literal('asc'), effect_1.Schema.Literal('desc'));
// TODO(ZaymonFC): Struct vs pair?
var FieldSort = effect_1.Schema.Struct({
    fieldId: effect_1.Schema.String,
    direction: SortDirection,
}).pipe(effect_1.Schema.mutable);
exports.FieldSortType = FieldSort;
/**
 * ECHO query object.
 */
var QuerySchema = effect_1.Schema.Struct({
    typename: effect_1.Schema.optional(effect_1.Schema.String),
    sort: effect_1.Schema.optional(effect_1.Schema.Array(FieldSort)),
}).pipe(effect_1.Schema.mutable);
exports.QueryType = QuerySchema;
