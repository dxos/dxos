//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key, Obj } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EID } from '@dxos/keys';

import { type SpaceSchema } from '#types';

/** Peer → viewer state, per presence key. */
export type ViewersByObject = Record<string, Record<string, SpaceSchema.ObjectViewerProps>>;

export const PRESENCE_BROADCAST_INTERVAL = 30_000;

export const PRESENCE_EXPIRY = 2 * PRESENCE_BROADCAST_INTERVAL;

/** Longest a move in an attended object waits before peers hear of it. */
export const LOCATION_BROADCAST_INTERVAL = 1_000;

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

/** The `viewing` gossip message: the sender's open objects as deltas, the ones it attends, and where it is in those. */
export type ViewingMessage = {
  identityKey: string;
  added: string[];
  removed: string[];
  attended: string[];
  locations: Record<string, SpaceSchema.PeerLocation>;
};

const isString = (value: unknown): value is string => typeof value === 'string';

const parseLocation = (value: unknown): SpaceSchema.PeerLocation | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { selection, viewport } = value as Record<string, unknown>;
  const location = {
    ...(isString(selection) && { selection }),
    ...(isString(viewport) && { viewport }),
  };
  return location.selection || location.viewport ? location : undefined;
};

/** Narrows a gossip payload, which arrives as opaque JSON, to a {@link ViewingMessage}. */
export const parseViewingMessage = (payload: Record<string, unknown>): ViewingMessage | undefined => {
  const { identityKey, added, removed, attended, locations } = payload;
  if (!isString(identityKey) || !Array.isArray(added) || !Array.isArray(removed)) {
    return undefined;
  }
  const parsedLocations: Record<string, SpaceSchema.PeerLocation> = {};
  if (typeof locations === 'object' && locations !== null) {
    for (const [key, value] of Object.entries(locations)) {
      const location = parseLocation(value);
      if (location) {
        parsedLocations[key] = location;
      }
    }
  }
  return {
    identityKey,
    added: added.filter(isString),
    removed: removed.filter(isString),
    attended: Array.isArray(attended) ? attended.filter(isString) : [],
    locations: parsedLocations,
  };
};

/** Records `peer`'s {@link ViewingMessage} in the viewers map, seen at `lastSeen`. */
export const applyViewingMessage = (
  viewersByObject: ViewersByObject,
  peer: string,
  { added, removed, attended, locations }: ViewingMessage,
  lastSeen: number,
): ViewersByObject => {
  const next = { ...viewersByObject };
  for (const key of added) {
    const location = locations[key];
    next[key] = {
      ...next[key],
      [peer]: { lastSeen, currentlyAttended: attended.includes(key), ...(location && { location }) },
    };
  }
  for (const key of removed) {
    if (next[key]?.[peer]) {
      const { [peer]: _, ...rest } = next[key];
      next[key] = rest;
    }
  }
  return next;
};

/** Id of the deck companion listing everyone in the active space. */
export const MEMBERS_COMPANION_ID = 'members';

/** Segment prefix of a peer's node under its space node. */
export const PEER_SEGMENT_PREFIX = 'peer-';

export const getPeerNodeId = (spaceId: string, identityKey: string): string =>
  GraphNode.qualifyId(GraphPath.getSpacePath(spaceId), `${PEER_SEGMENT_PREFIX}${identityKey}`);

const isFresh = (viewer: SpaceSchema.ObjectViewerProps, now: number) => now - viewer.lastSeen < PRESENCE_EXPIRY;

const isInSpace = (key: string, spaceId: string) => {
  const eid = EID.tryParse(key);
  return eid !== undefined && EID.getSpaceId(eid) === spaceId;
};

/** Peers seen in the space within {@link PRESENCE_EXPIRY} of `now`. */
export const getSpacePeers = (viewersByObject: ViewersByObject, spaceId: string, now: number): string[] => {
  const peers = new Set<string>();
  for (const [key, viewers] of Object.entries(viewersByObject)) {
    if (isInSpace(key, spaceId)) {
      for (const [peer, viewer] of Object.entries(viewers)) {
        if (isFresh(viewer, now)) {
          peers.add(peer);
        }
      }
    }
  }
  return [...peers].sort();
};

export type PeerFocus = { key: EID.EID; location?: SpaceSchema.PeerLocation };

/** The object `peer` attends in the space and where they are in it; the most recently seen, when they attend several. */
export const getPeerFocus = (
  viewersByObject: ViewersByObject,
  spaceId: string,
  peer: string,
  now: number,
): PeerFocus | undefined => {
  let focus: (PeerFocus & { lastSeen: number }) | undefined;
  for (const [key, viewers] of Object.entries(viewersByObject)) {
    const viewer = viewers[peer];
    const eid = EID.tryParse(key);
    if (
      eid &&
      viewer?.currentlyAttended &&
      isFresh(viewer, now) &&
      EID.getSpaceId(eid) === spaceId &&
      (!focus || viewer.lastSeen > focus.lastSeen)
    ) {
      focus = { key: eid, location: viewer.location, lastSeen: viewer.lastSeen };
    }
  }
  return focus && { key: focus.key, location: focus.location };
};
