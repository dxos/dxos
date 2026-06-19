//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Marks a schema type as eligible to live inside a collection (e.g. Documents, Sketches, Files).
 * Types without this annotation appear in the database section instead.
 *
 * @idiom org.dxos.schema.collectionItem
 *   applies: Making objects of a type surface inside collections (the Collections sidebar section) rather than only under the generic database subtree
 *   instead-of: Leaving the type unannotated, which files new objects under `types/<slug>` in the database section where they are harder to discover and cannot be organized into collections
 *   uses: {@link CollectionItemAnnotation}
 */
export const CollectionItemAnnotationId = Symbol.for('@dxos/schema/annotation/CollectionItem');
export const CollectionItemAnnotation = createAnnotationHelper<boolean>(CollectionItemAnnotationId);
