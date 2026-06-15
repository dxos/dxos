//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';
import { EdgeService } from '@dxos/protocols';
import { compositeKey } from '@dxos/util';

/**
 * Returns true if the given peerId belongs to an EDGE replicator (Automerge or Subduction).
 *
 * When `spaceId` is provided, the match is scoped to that space (peerId must start with
 * `<service>:<spaceId>`). When omitted, only the leading service segment is checked
 * (peerId must start with `<service>:`), which is useful when the caller doesn't have a
 * spaceId on hand or wants to match any edge replicator regardless of space.
 */
export const isEdgePeerId = (peerId: string, spaceId?: SpaceId): boolean => {
  const automergePrefix =
    spaceId !== undefined
      ? compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId)
      : `${EdgeService.AUTOMERGE_REPLICATOR}:`;
  const subductionPrefix =
    spaceId !== undefined
      ? compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId)
      : `${EdgeService.SUBDUCTION_REPLICATOR}:`;
  return peerId.startsWith(automergePrefix) || peerId.startsWith(subductionPrefix);
};
