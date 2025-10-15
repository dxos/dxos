//
// Copyright 2025 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';

import { GeneratorAnnotationId, LabelAnnotationId, PropertyMetaAnnotationId } from '../ast';
import { CurrencyAnnotationId, FormatAnnotationId } from '../formats';
import { type JsonSchemaEchoAnnotations, type JsonSchemaType } from '../json-schema';

//
// This file configures annotations for JSON encoding/decoding.
//

// Go on the root level.
type RootJsonSchemaProperty = keyof JsonSchemaType;

// Go on the namespaced `annotations` property.
type NamespacedJsonSchemaProperty = keyof JsonSchemaEchoAnnotations;

/**
 * List of annotations for JSON encoding/decoding.
 * Omits default effect-schema annotations since they are encoded with default serializer.
 */
// TODO(burdon): Reconcile with `EchoAnnotations`.
export const CustomAnnotations: Partial<Record<RootJsonSchemaProperty, symbol>> = {
  format: FormatAnnotationId,
  currency: CurrencyAnnotationId,
};

/**
 * List of annotations for JSON decoding only.
 * Includes default effect annotations.
 */
export const DecodedAnnotations: Partial<Record<RootJsonSchemaProperty, symbol>> = {
  title: SchemaAST.TitleAnnotationId,
  description: SchemaAST.DescriptionAnnotationId,
};

/**
 * Annotations that go into ECHO namespace in json-schema.
 */
// TODO(dmaretskyi): Consider removing ECHO namespace and putting them at the top level.
// TODO(dmaretskyi): Move to format.ts when circular imports are solved
export const EchoAnnotations: Partial<Record<NamespacedJsonSchemaProperty, symbol>> = {
  // TODO(dmaretskyi): `FieldLookupAnnotationId` might go here, but lets remove it entirely and use LabelAnnotation instead.
  meta: PropertyMetaAnnotationId,
  generator: GeneratorAnnotationId,
  labelProp: LabelAnnotationId,
};
