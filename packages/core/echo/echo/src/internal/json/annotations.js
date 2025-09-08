"use strict";
//
// Copyright 2025 DXOS.org
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoAnnotations = exports.DecodedAnnotations = exports.CustomAnnotations = void 0;
var effect_1 = require("effect");
var ast_1 = require("../ast");
var formats_1 = require("../formats");
/**
 * List of annotations for JSON encoding/decoding.
 * Omits default effect-schema annotations since they are encoded with default serializer.
 */
// TODO(burdon): Reconcile with `EchoAnnotations`.
exports.CustomAnnotations = {
    format: formats_1.FormatAnnotationId,
    currency: formats_1.CurrencyAnnotationId,
};
/**
 * List of annotations for JSON decoding only.
 * Includes default effect annotations.
 */
exports.DecodedAnnotations = {
    title: effect_1.SchemaAST.TitleAnnotationId,
    description: effect_1.SchemaAST.DescriptionAnnotationId,
};
/**
 * Annotations that go into ECHO namespace in json-schema.
 */
// TODO(dmaretskyi): Consider removing ECHO namespace and putting them at the top level.
// TODO(dmaretskyi): Move to format.ts when circular imports are solved
exports.EchoAnnotations = {
    // TODO(dmaretskyi): `FieldLookupAnnotationId` might go here, but lets remove it entirely and use LabelAnnotation instead.
    meta: ast_1.PropertyMetaAnnotationId,
    generator: ast_1.GeneratorAnnotationId,
    labelProp: ast_1.LabelAnnotationId,
};
