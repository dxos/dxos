//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key, Obj } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EID } from '@dxos/keys';

import { type SpaceSchema } from '#types';

/** Identity → session → viewer state, for one object. */
export type ObjectViewers = Record<string, Record<string, SpaceSchema.ObjectViewerProps>>;

/** {@link ObjectViewers}, per presence key. */
export type ViewersByObject = Record<string, ObjectViewers>;

export const PRESENCE_BROADCAST_INTERVAL = 30_000;

export const PRESENCE_EXPIRY = 2 * PRESENCE_BROADCAST_INTERVAL;

/** A session whose anchor moved within this window of now is active; otherwise it is idle. */
export const ACTIVITY_WINDOW = 60_000;

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

/**
 * The `viewing` gossip message: the sender's open objects as deltas, the ones it attends, and where it is in those.
 * One per session (a tab or app instance); a sender without `sessionId` counts as one session of its identity.
 */
export type ViewingMessage = {
  identityKey: string;
  sessionId?: string;
  device?: SpaceSchema.SessionDevice;
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

const DEVICE_KINDS: ReadonlySet<string> = new Set(['browser', 'native', 'mobile', 'agent', 'unknown']);

const isDeviceKind = (value: unknown): value is NonNullable<SpaceSchema.SessionDevice['kind']> =>
  isString(value) && DEVICE_KINDS.has(value);

const parseDevice = (value: unknown): SpaceSchema.SessionDevice | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { label, platform, os, kind } = value as Record<string, unknown>;
  const device = {
    ...(isString(label) && { label }),
    ...(isString(platform) && { platform }),
    ...(isString(os) && { os }),
    ...(isDeviceKind(kind) && { kind }),
  };
  return Object.keys(device).length > 0 ? device : undefined;
};

/** Narrows a gossip payload, which arrives as opaque JSON, to a {@link ViewingMessage}. */
export const parseViewingMessage = (payload: Record<string, unknown>): ViewingMessage | undefined => {
  const { identityKey, sessionId, added, removed, attended, locations } = payload;
  const device = parseDevice(payload.device);
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
    ...(isString(sessionId) && { sessionId }),
    ...(device && { device }),
    added: added.filter(isString),
    removed: removed.filter(isString),
    attended: Array.isArray(attended) ? attended.filter(isString) : [],
    locations: parsedLocations,
  };
};

const isSameLocation = (a?: SpaceSchema.PeerLocation, b?: SpaceSchema.PeerLocation) =>
  a?.selection === b?.selection && a?.viewport === b?.viewport;

/**
 * Records `peer`'s {@link ViewingMessage} in the viewers map, seen at `lastSeen`. A session has moved when it first
 * opens an object, comes back to it, or its anchor changes there.
 */
export const applyViewingMessage = (
  viewersByObject: ViewersByObject,
  peer: string,
  { sessionId = peer, device, added, removed, attended, locations }: ViewingMessage,
  lastSeen: number,
): ViewersByObject => {
  const next = { ...viewersByObject };
  for (const key of added) {
    const previous = next[key]?.[peer]?.[sessionId];
    const location = locations[key];
    const currentlyAttended = attended.includes(key);
    const moved =
      !previous || (currentlyAttended && (!previous.currentlyAttended || !isSameLocation(previous.location, location)));
    next[key] = {
      ...next[key],
      [peer]: {
        ...next[key]?.[peer],
        [sessionId]: {
          lastSeen,
          movedAt: moved ? lastSeen : previous.movedAt,
          currentlyAttended,
          ...(location && { location }),
          ...(device && { device }),
        },
      },
    };
  }
  for (const key of removed) {
    const sessions = next[key]?.[peer];
    if (sessions?.[sessionId]) {
      const { [sessionId]: _, ...rest } = sessions;
      const { [peer]: __, ...others } = next[key];
      next[key] = Object.keys(rest).length > 0 ? { ...others, [peer]: rest } : others;
    }
  }
  return next;
};

export const isFresh = (viewer: SpaceSchema.ObjectViewerProps, now: number) => now - viewer.lastSeen < PRESENCE_EXPIRY;

/** Whether the session's anchor moved within {@link ACTIVITY_WINDOW} of `now`. */
export const isMoving = (viewer: SpaceSchema.ObjectViewerProps, now: number) => now - viewer.movedAt < ACTIVITY_WINDOW;

export type PeerSession = SpaceSchema.ObjectViewerProps & { sessionId: string };

/** An identity's sessions on an object seen within {@link PRESENCE_EXPIRY}, the most recently moved first. */
export const getFreshSessions = (
  sessions: Record<string, SpaceSchema.ObjectViewerProps> | undefined,
  now: number,
): PeerSession[] =>
  Object.entries(sessions ?? {})
    .filter(([, viewer]) => isFresh(viewer, now))
    .map(([sessionId, viewer]) => ({ ...viewer, sessionId }))
    .toSorted((a, b) => b.movedAt - a.movedAt);

/** How many identities have a fresh session on the object. */
export const countViewers = (viewers: ObjectViewers | undefined, now: number) =>
  Object.values(viewers ?? {}).filter((sessions) => getFreshSessions(sessions, now).length > 0).length;

/** Id of the deck companion listing everyone in the active space. */
export const MEMBERS_COMPANION_ID = 'members';

/** Segment prefix of a peer's node under its space node. */
export const PEER_SEGMENT_PREFIX = 'peer-';

export const getPeerNodeId = (spaceId: string, identityKey: string): string =>
  GraphNode.qualifyId(GraphPath.getSpacePath(spaceId), `${PEER_SEGMENT_PREFIX}${identityKey}`);

/** Segment prefix of a session's node under its peer's node. */
export const SESSION_SEGMENT_PREFIX = 'session-';

export const getSessionNodeId = (spaceId: string, identityKey: string, sessionId: string): string =>
  GraphNode.qualifyId(getPeerNodeId(spaceId, identityKey), `${SESSION_SEGMENT_PREFIX}${sessionId}`);

const isInSpace = (key: string, spaceId: string) => {
  const eid = EID.tryParse(key);
  return eid !== undefined && EID.getSpaceId(eid) === spaceId;
};

/** Peers seen in the space within {@link PRESENCE_EXPIRY} of `now`. */
export const getSpacePeers = (viewersByObject: ViewersByObject, spaceId: string, now: number): string[] => {
  const peers = new Set<string>();
  for (const [key, viewers] of Object.entries(viewersByObject)) {
    if (isInSpace(key, spaceId)) {
      for (const [peer, sessions] of Object.entries(viewers)) {
        if (getFreshSessions(sessions, now).length > 0) {
          peers.add(peer);
        }
      }
    }
  }
  return [...peers].sort();
};

/** Ids of `peer`'s sessions seen in the space within {@link PRESENCE_EXPIRY} of `now`. */
export const getPeerSessionIds = (
  viewersByObject: ViewersByObject,
  spaceId: string,
  peer: string,
  now: number,
): string[] => {
  const sessionIds = new Set<string>();
  for (const [key, viewers] of Object.entries(viewersByObject)) {
    if (isInSpace(key, spaceId)) {
      for (const { sessionId } of getFreshSessions(viewers[peer], now)) {
        sessionIds.add(sessionId);
      }
    }
  }
  return [...sessionIds].sort();
};

export type PeerFocus = { key: EID.EID; sessionId: string; location?: SpaceSchema.PeerLocation };

/**
 * The object a session of `peer` attends in the space and where it is in it: the given session's, or else the session
 * that moved most recently.
 */
export const getPeerFocus = (
  viewersByObject: ViewersByObject,
  spaceId: string,
  peer: string,
  now: number,
  sessionId?: string,
): PeerFocus | undefined => {
  let focus: (PeerFocus & { movedAt: number }) | undefined;
  for (const [key, viewers] of Object.entries(viewersByObject)) {
    const eid = EID.tryParse(key);
    if (!eid || EID.getSpaceId(eid) !== spaceId) {
      continue;
    }
    for (const session of getFreshSessions(viewers[peer], now)) {
      if (
        session.currentlyAttended &&
        (sessionId === undefined || session.sessionId === sessionId) &&
        (!focus || session.movedAt > focus.movedAt)
      ) {
        focus = { key: eid, sessionId: session.sessionId, location: session.location, movedAt: session.movedAt };
      }
    }
  }
  return focus && { key: focus.key, sessionId: focus.sessionId, location: focus.location };
};
