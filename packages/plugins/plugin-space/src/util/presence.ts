//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';

/** How often a peer re-announces what it is viewing, so others can expire it if it disconnects. */
export const PRESENCE_BROADCAST_INTERVAL = 30_000;

/** Two missed announcements, so a viewer does not flicker out between heartbeats. */
export const PRESENCE_EXPIRY = 2 * PRESENCE_BROADCAST_INTERVAL;

/**
 * What a peer is viewing, keyed by EID: the sender holds graph paths and the receiver holds objects,
 * and the EID is what both resolve to.
 *
 * A path resolves to its innermost object (a companion or view discriminator below the object still
 * counts as viewing it), or to the space itself when it names no object.
 */
export const getPresenceKeyFromPath = (path: string): EID.EID | undefined => {
  const spaceId = GraphPath.getSpaceIdFromPath(path);
  if (!spaceId) {
    return undefined;
  }

  const entityId = path.split('/').findLast(Key.EntityId.isValid);
  return EID.make({ spaceId, entityId });
};

/** The presence keys of `paths`, grouped by space; paths outside any space are dropped. */
export const groupPresenceKeysBySpace = (paths: readonly string[]): Map<Key.SpaceId, EID.EID[]> => {
  const bySpace = new Map<Key.SpaceId, EID.EID[]>();
  for (const path of paths) {
    const key = getPresenceKeyFromPath(path);
    const spaceId = key && EID.getSpaceId(key);
    if (key && spaceId) {
      bySpace.set(spaceId, [...(bySpace.get(spaceId) ?? []), key]);
    }
  }
  return bySpace;
};

export const getPresenceKeyFromObject = (object: Obj.Unknown): EID.EID | undefined => {
  const spaceId = Obj.getDatabase(object)?.spaceId;
  return spaceId ? EID.make({ spaceId, entityId: object.id }) : undefined;
};

export const getPresenceKeyFromSpace = (spaceId: Key.SpaceId): EID.EID => EID.make({ spaceId });
