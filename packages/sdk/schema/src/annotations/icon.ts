//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

export const IconAnnotationId = '@dxos/schema/IconAnnotationId';

export const IconAnnotation = Annotation.make({ id: IconAnnotationId, schema: Schema.String, legacyId: true });

export const getIconAnnotation = (schema: Schema.Codec<any, any>): string | undefined =>
  IconAnnotation.get(schema).pipe(Option.getOrUndefined) as string | undefined;

/**
 * Add an icon to a schema.
 *
 * @param icon string icon name from phosphor-icons (e.g., 'ph--user--regular')
 */
// TODO(burdon): Probably best not to include in type system? Instead incl. in plugin metadata.
/** Set a schema's icon annotation. */
export const withIcon = (icon: string) => IconAnnotation.set(icon);
