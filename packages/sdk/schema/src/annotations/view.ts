//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

// TODO(wittjosiah): This won't serialize into echo. Migrate to `Annotation.make` to store in `PropertyMeta`.
/**
 * Identifies a schema as a view.
 */
export const ViewAnnotationId = Symbol.for('@dxos/schema/annotation/View');
export const ViewAnnotation = createAnnotationHelper<boolean>(ViewAnnotationId);
