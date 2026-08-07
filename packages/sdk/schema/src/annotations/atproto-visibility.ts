//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * A field's visibility across the ECHO → atproto publishing boundary. One of:
 * - `publish` — the field crosses the boundary; the codec's `encode` writes it into our record and the
 *   network reads it from us. We are the source of truth for it.
 * - `mirror` — the field is visible to the network via a linked upstream record (resolved by id, e.g.
 *   a book's catalog from BookHive), not from our record. We keep a local, editable copy but do not
 *   publish it.
 * - `private` — the field never crosses the boundary; it is ECHO-only. This is the default for every
 *   unannotated field: the safety invariant that keeps private notes, ownership, and personal tags off
 *   the network unless a human deliberately marks a field otherwise.
 *
 * Set on a field or a struct. Visibility is inherited by descendants: a field with no own visibility
 * takes its enclosing struct's, and an unannotated root field is `private`. An explicit visibility on a
 * field overrides the inherited one — so a `publish` field inside a `mirror` struct (the denormalized
 * identifying subset) stays published, and a field can be forced `private` inside an otherwise-mirrored
 * struct.
 */
export type AtprotoVisibility = 'publish' | 'mirror' | 'private';

export const AtprotoVisibilityAnnotationId = Symbol.for('@dxos/schema/annotation/AtprotoVisibility');
export const AtprotoVisibilityAnnotation = createAnnotationHelper<AtprotoVisibility>(AtprotoVisibilityAnnotationId);
