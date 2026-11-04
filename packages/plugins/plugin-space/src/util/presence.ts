//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';

export const PRESENCE_BROADCAST_INTERVAL = 30_000;

export const PRESENCE_EXPIRY = 2 * PRESENCE_BROADCAST_INTERVAL;

export const getPresenceKeyFromPath = (path: string): EID.EID | undefined => {
  const spaceId = GraphPath.getSpaceIdFromPath(path);
  if (!spaceId) {
    return undefined;
  }

  const innermostEntityId = path.split('/').findLast(Key.EntityId.isValid);
  return EID.make({ spaceId, entityId: innermostEntityId });
};

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

export type PresenceChanges = { added: EID.EID[]; removed: EID.EID[] };

export const groupPresenceChangesBySpace = (
  active: readonly string[],
  inactive: readonly string[],
): Map<Key.SpaceId, PresenceChanges> => {
  const addedBySpace = groupPresenceKeysBySpace(active);
  const removedBySpace = groupPresenceKeysBySpace(inactive);
  const bySpace = new Map<Key.SpaceId, PresenceChanges>();
  for (const spaceId of new Set([...addedBySpace.keys(), ...removedBySpace.keys()])) {
    const added = addedBySpace.get(spaceId) ?? [];
    const removed = (removedBySpace.get(spaceId) ?? []).filter((key) => !added.includes(key));
    bySpace.set(spaceId, { added, removed });
  }
  return bySpace;
};

export const getPresenceKeyFromObject = (object: Obj.Unknown): EID.EID | undefined => {
  const spaceId = Obj.getDatabase(object)?.spaceId;
  return spaceId ? EID.make({ spaceId, entityId: object.id }) : undefined;
};

export const getPresenceKeyFromSpace = (spaceId: Key.SpaceId): EID.EID => EID.make({ spaceId });
