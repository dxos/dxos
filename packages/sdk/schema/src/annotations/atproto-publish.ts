//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Marks a field as eligible to cross the ECHO → atproto publishing boundary.
 *
 * Public opt-in: a field is published only if explicitly `AtprotoPublishAnnotation.set(true)`.
 * Unmarked fields are private (ECHO-only) by default — the safety invariant that keeps private
 * notes, ownership, and personal tags off the network unless a human deliberately exposes them.
 */
export const AtprotoPublishAnnotationId = Symbol.for('@dxos/schema/annotation/AtprotoPublish');
export const AtprotoPublishAnnotation = createAnnotationHelper<boolean>(AtprotoPublishAnnotationId);
