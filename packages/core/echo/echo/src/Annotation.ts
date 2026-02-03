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
  getDescription,
  getLabel,
  getTypeAnnotation,
  setDescription,
  setLabel,
} from './internal/annotations';

import * as internalAnnotations from './internal/annotations';
import { Schema } from 'effect';

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
