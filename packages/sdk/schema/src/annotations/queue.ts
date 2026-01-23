//
// Copyright 2025 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

// TODO(wittjosiah): This won't serialize into echo. Migrate to `Annotation.make` to store in `PropertyMeta`.
/**
 * Identifies a schema as an object with a canonical queue reference
 *  (i.e., a reference to a queue in the queue property).
 */
export const QueueAnnotationId = Symbol.for('@dxos/schema/annotation/Queue');
export const QueueAnnotation = createAnnotationHelper<boolean>(QueueAnnotationId);
