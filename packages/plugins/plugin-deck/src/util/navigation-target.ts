//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { EntityId } from '@dxos/keys';

/**
 * Every ECHO object id a URL pair's `id` field could be referring to, in the order they appear.
 *
 * Which `+`-joined segment holds the object id is extension-specific — `<objectId>+<view>` for a
 * mailbox's filter views, `<typeSlug>+<objectId>` for a database object — and the position is
 * declared nowhere, so no single index is correct. A `SpaceId` cannot be mistaken for an object id
 * (33-char multibase vs 26-char ULID).
 */
export const getCandidateEntityIds = (pairId: string, tailSeparator: string): string[] =>
  pairId.split(tailSeparator).filter((segment) => EntityId.isValid(segment));

/**
 * Fold the verdicts gathered for one pair (across its candidate ids and every loader).
 *
 * `absent` requires unanimity over a non-empty set: silence is not disconfirmation.
 */
export const combineVerdicts = (
  verdicts: readonly AppCapabilities.NavigationTargetVerdict[],
): AppCapabilities.NavigationTargetVerdict => {
  if (verdicts.includes('exists')) {
    return 'exists';
  }
  if (verdicts.length === 0 || verdicts.includes('unknown')) {
    return 'unknown';
  }
  return 'absent';
};
