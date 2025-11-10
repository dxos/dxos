//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Identifies a schema as a view.
 */
export const SystemAnnotationId = Symbol.for('@dxos/schema/annotation/System');
export const SystemAnnotation = createAnnotationHelper<boolean>(SystemAnnotationId);
