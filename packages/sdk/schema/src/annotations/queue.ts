//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation } from '@dxos/echo';

/**
 * Identifies a schema as an object with a canonical queue reference
 *  (i.e., a reference to a queue in the queue property).
 */
export const QueueAnnotationId = '@dxos/schema/annotation/Queue';

/** @deprecated Use `Feed` objects instead. */
export const QueueAnnotation = Annotation.make({ id: QueueAnnotationId, schema: Schema.Boolean, legacyId: true });
