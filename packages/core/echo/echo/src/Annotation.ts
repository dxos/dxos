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

import * as Schema from 'effect/Schema';

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

const IconAnnotationSchema = Schema.Struct({
  /**
   * Phosphor icon name (e.g., 'ph--user--regular', 'ph--cube--regular', 'ph--link--regular ', etc.)
   */
  icon: Schema.String.pipe(Schema.pattern(/^ph--[a-z-]+--[a-z]+$/)),

  /**
   * Color name.
   *
   * List of colors:
   *  - 'red'
   *  - 'orange'
   *  - 'amber'
   *  - 'yellow'
   *  - 'lime'
   *  - 'green'
   *  - 'emerald'
   *  - 'teal'
   *  - 'cyan'
   *  - 'violet'
   *  - 'purple'
   *  - 'fuchsia'
   *  - 'pink'
   *  - 'rose'
   */

  hue: Schema.optional(Schema.String),
});

export interface IconAnnotation extends Schema.Schema.Type<typeof IconAnnotationSchema> {}

/**
 * Icon to render in the UI.
 */
export const IconAnnotation = make<IconAnnotation>({
  id: 'dxos.org/annotation/Icon',
  schema: IconAnnotationSchema,
});
