//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Marks a schema type as eligible to live inside a collection (e.g. Documents, Sketches, Files).
 * Types without this annotation appear in the database section instead.
 */
export const CollectionItemAnnotationId = Symbol.for('@dxos/schema/annotation/CollectionItem');
export const CollectionItemAnnotation = createAnnotationHelper<boolean>(CollectionItemAnnotationId);
