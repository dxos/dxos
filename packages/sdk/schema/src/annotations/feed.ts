//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Identifies a schema as an object with a canonical feed reference
 * (i.e., a reference to a feed in the feed property).
 */
export const FeedAnnotationId = Symbol.for('@dxos/schema/annotation/Feed');
export const FeedAnnotation = createAnnotationHelper<boolean>(FeedAnnotationId);
