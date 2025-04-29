//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo-schema';

export const IconAnnotationId: unique symbol = Symbol.for('@dxos/schema/IconAnnotationId');

/**
 * Add an icon to a schema.
 *
 * @param icon string icon name from phosphor-icons (e.g., 'ph--user--regular')
 */
export const IconAnnotation = createAnnotationHelper<string>(IconAnnotationId);
