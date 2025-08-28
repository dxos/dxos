//
// Copyright 2025 DXOS.org
//

import { Option, type Schema } from 'effect';

import { createAnnotationHelper } from '@dxos/echo/internal';

export const IconAnnotationId: unique symbol = Symbol.for('@dxos/schema/IconAnnotationId');

export const IconAnnotation = createAnnotationHelper<string>(IconAnnotationId);

export const getIconAnnotation = (schema: Schema.Schema.AnyNoContext): string | undefined =>
  IconAnnotation.get(schema).pipe(Option.getOrUndefined) as string | undefined;

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
