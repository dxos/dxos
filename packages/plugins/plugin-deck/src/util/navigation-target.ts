//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { EntityId } from '@dxos/keys';

/**
 * Every ECHO object id a URL pair's `id` field could be referring to, in the order they appear.
 *
 * A pair id `+`-joins every node-id segment after its binding's declared path, and which of those
 * segments is the object id is extension-specific: `<objectId>+<view>` for a mailbox's filter views
 * (`sent`, `drafts`), `<typeSlug>+<objectId>` for a database object. The encoding is positional and
 * the position is recorded nowhere, so no single index is correct — ask about every segment that
 * could be an id and let the store decide.
 *
 * Segments that are not ULIDs (view discriminators, type slugs) are dropped rather than queried.
 * A `SpaceId` cannot be mistaken for one: 33-char multibase vs 26-char ULID.
 */
export const getCandidateEntityIds = (pairId: string, tailSeparator: string): string[] =>
  pairId.split(tailSeparator).filter((segment) => EntityId.isValid(segment));

/**
 * Fold the verdicts gathered for one pair (across its candidate ids and every loader) into the
 * pair's verdict.
 *
 * `absent` requires unanimity over a non-empty set: one store saying "yes" settles it, and a single
 * `unknown` means the pair was never conclusively disconfirmed. Nothing to ask — no candidates, or
 * no loaders — is `unknown` too, since silence is not disconfirmation.
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
