"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectOptionSchema = void 0;
var effect_1 = require("effect");
/** Schema for a single select option. Used to define choices in a {single|multi}-select field. */
exports.SelectOptionSchema = effect_1.Schema.Struct({
    /** Stable identifier for the option. */
    id: effect_1.Schema.NonEmptyString,
    title: effect_1.Schema.String,
    /** Color palette used for visual styling. */
    color: effect_1.Schema.String,
}).pipe(effect_1.Schema.mutable);
