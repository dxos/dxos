"use strict";
//
// Copyright 2024 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEchoSchema = void 0;
var signals_core_1 = require("@preact/signals-core");
var internal_1 = require("@dxos/echo/internal");
var echo_signals_1 = require("@dxos/echo-signals");
var invariant_1 = require("@dxos/invariant");
var object_1 = require("../internal/object");
// NOTE: Registration is done here is this is the module that calls out to `effect`.
(0, echo_signals_1.registerSignalsRuntime)();
/**
 * Create a reactive mutable schema that updates when the JSON schema is updated.
 */
// TODO(dmaretskyi): Should be replaced by registration of typed object.
var createEchoSchema = function (schema) {
    var typename = (0, internal_1.getSchemaTypename)(schema);
    (0, invariant_1.assertArgument)(typename, 'Schema does not have a typename.');
    var echoSchema = new internal_1.EchoSchema((0, object_1.live)(internal_1.StoredSchema, {
        typename: typename,
        version: '0.1.0',
        jsonSchema: (0, internal_1.toJsonSchema)(schema),
    }));
    // TODO(burdon): Unsubscribe is never called.
    (0, signals_core_1.effect)(function () {
        var _ = echoSchema.jsonSchema;
        echoSchema._invalidate();
    });
    return echoSchema;
};
exports.createEchoSchema = createEchoSchema;
