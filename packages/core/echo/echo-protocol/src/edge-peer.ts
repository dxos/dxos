//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';
import { EdgeService } from '@dxos/protocols';
import { compositeKey } from '@dxos/util';

/**
 * Returns true if the given peerId belongs to an EDGE replicator (Automerge or Subduction)
 * for the given space.
 */
export const isEdgePeerId = (spaceId: SpaceId, peerId: string): boolean =>
  peerId.startsWith(compositeKey(EdgeService.AUTOMERGE_REPLICATOR, spaceId)) ||
  peerId.startsWith(compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId));
