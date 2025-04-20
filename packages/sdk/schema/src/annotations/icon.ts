//
// Copyright 2025 DXOS.org
//

import { Option, SchemaAST, type Schema } from 'effect';

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const IconAnnotationId: unique symbol = Symbol.for('@dxos/schema/IconAnnotationId');

/**
 * Add an icon to a schema.
 *
 * @param icon string icon name from phosphor-icons (e.g., 'ph--user--regular')
 */
// TODO(burdon): Probably best not to include in type system? Instead incl. in plugin metadata.
export const withIcon =
  (icon: string) =>
  <Self extends Schema.Schema.All>(schema: Self) =>
    schema.annotations({
      [IconAnnotationId]: icon,
    });

export const getIconAnnotation = (schema: Schema.Schema.AnyNoContext): string | undefined =>
  SchemaAST.getAnnotation(schema.ast, IconAnnotationId).pipe(Option.getOrUndefined) as string | undefined;
