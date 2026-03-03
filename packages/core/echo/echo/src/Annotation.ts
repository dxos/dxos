//
// Copyright 2025 DXOS.org
//

export {
  DescriptionAnnotation,
  FormInputAnnotation,
  GeneratorAnnotation,
  LabelAnnotation,
  ReferenceAnnotation,
  SystemTypeAnnotation,
  TypeAnnotation,
  getDescriptionWithSchema,
  getLabelWithSchema,
  getTypeAnnotation,
  setDescriptionWithSchema,
  setLabelWithSchema,
} from './internal/annotations';

import type * as Schema from 'effect/Schema';

import * as internalAnnotations from './internal/annotations';

interface MakeProps<T> {
  id: string;
  schema: Schema.Schema<T, any, never>;
}

/**
 * Create a new schema annotation.
 * Annotation can be assigned both to fields and to the schema itself.
 * Annotation is serialized with the schema.
 *
 * @example
 * ```ts
 * const ColorAnnotation = Annotation.make({
 *   id: 'dxos.org/annotation/Color',
 *   schema: Schema.String,
 * });
 *
 * const schema = Schema.String.annotations(ColorAnnotation.set('red'));
 * ```
 */
export const make: <T>(props: MakeProps<T>) => internalAnnotations.AnnotationHelper<T> =
  internalAnnotations.makeUserAnnotation;
