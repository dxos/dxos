//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Identifies a schema as a view.
 */
export const ViewAnnotationId = Symbol.for('@dxos/schema/annotation/View');
export const ViewAnnotation = createAnnotationHelper<boolean>(ViewAnnotationId);
