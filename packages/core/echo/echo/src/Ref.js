"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromDXN = exports.make = exports.isRef = exports.Array = void 0;
var EchoSchema = require("@dxos/echo/internal");
exports.Array = EchoSchema.RefArray;
exports.isRef = EchoSchema.Ref.isRef;
exports.make = EchoSchema.Ref.make;
// TODO(dmaretskyi): Consider just allowing `make` to accept DXN.
exports.fromDXN = EchoSchema.Ref.fromDXN;
