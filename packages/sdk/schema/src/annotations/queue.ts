//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Identifies a schema as an object with a canonical queue reference
 *  (i.e., a reference to a queue in the queue property).
 */
// TODO(wittjosiah): This won't serialize in ECHO. Migrate to `Annotation.make` to store in `PropertyMeta`.
export const QueueAnnotationId = Symbol.for('@dxos/schema/annotation/Queue');

/** @deprecated Use `Feed` objects instead. */
export const QueueAnnotation = createAnnotationHelper<boolean>(QueueAnnotationId);
