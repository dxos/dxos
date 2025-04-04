import { Option, SchemaAST, type Schema } from 'effect';

export const IconAnnotationId: unique symbol = Symbol.for('@dxos/schema/IconAnnotationId');

/**
 * Add an icon to a schema.
 *
 * @param icon string icon name from phosphor-icons (e.g., 'user')
 */
export const withIcon =
  (icon: string) =>
  <S extends Schema.Schema.AnyNoContext>(schema: S) =>
    schema.annotations({
      [IconAnnotationId]: icon,
    });

export const getIconAnnotation = (schema: Schema.Schema.AnyNoContext): string | undefined =>
  SchemaAST.getAnnotation(schema.ast, IconAnnotationId).pipe(Option.getOrUndefined) as string | undefined;
