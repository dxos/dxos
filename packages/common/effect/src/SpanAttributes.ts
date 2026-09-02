//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * Attribute naming the space a span's work ran in. One key everywhere — ECHO, the process runtime,
 * the stores, the AI stack — so one filter finds all of a space's work.
 */
export const SPACE_ID = 'spaceId';

/**
 * `Effect.withSpan` options naming the space, or none when the work is not scoped to one, since an
 * absent attribute is the honest answer and an undefined value is not an attribute.
 */
export const withSpace = (spaceId: string | null | undefined): { attributes: { spaceId: string } } | undefined =>
  spaceId ? { attributes: { [SPACE_ID]: spaceId } } : undefined;

/**
 * Stamps the space on every span the effect opens, for a caller that knows the space but not which
 * spans the work below it will open. Leaves the effect alone when there is no space.
 */
export const annotateSpace =
  (spaceId: string | null | undefined) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    spaceId ? Effect.annotateSpans(SPACE_ID, spaceId)(effect) : effect;
