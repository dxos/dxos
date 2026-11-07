//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Key, Obj } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import { EID } from '@dxos/keys';
import { type ChromaticPalette } from '@dxos/ui-types';

import { type SpaceSchema } from '#types';

/** Identity → session → viewer state, for one object. */
export type ObjectViewers = Record<string, Record<string, SpaceSchema.ObjectViewerProps>>;

/** {@link ObjectViewers}, per presence key. */
export type ViewersByObject = Record<string, ObjectViewers>;

/** Space → identity → session → a value that session reported in the space. */
export type PeerSessions<T> = Record<string, Record<string, Record<string, T>>>;

/** Space → identity → session → that session's deck in the space. */
export type PeerDecks = PeerSessions<SpaceSchema.PeerDeck>;

/** Space → identity → session → whom that session follows in the space. */
export type PeerFollowing = PeerSessions<FollowingTarget>;

export const PRESENCE_BROADCAST_INTERVAL = 30_000;

export const PRESENCE_EXPIRY = 2 * PRESENCE_BROADCAST_INTERVAL;

/**
 * How long a lapsed session is remembered: past any heartbeat gap a live tab leaves (a hidden tab's timers can run once
 * a minute), so one that reports again keeps when it last moved.
 */
export const PRESENCE_RETENTION = 10 * PRESENCE_EXPIRY;

/** A session whose anchor moved within this window of now is active; otherwise it is idle. */
export const ACTIVITY_WINDOW = 60_000;

/** Longest a move in an attended object waits before peers hear of it. */
export const LOCATION_BROADCAST_INTERVAL = 1_000;

/** {@link LOCATION_BROADCAST_INTERVAL} while someone follows this session. */
export const FOLLOW_BROADCAST_INTERVAL = 100;

/** How long a follower waits for its leader to attend an object in the space again before it stops following. */
/** The hue that marks every follow, on the leader's screen and each follower's alike. */
export const FOLLOW_HUE: ChromaticPalette = 'indigo';

export const FOLLOW_LOST_TIMEOUT = 5_000;

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

/** The peer, or one session of theirs, a session follows; carried in its {@link ViewingMessage}. */
export type FollowingTarget = Omit<SpaceSchema.FollowTarget, 'spaceId'>;

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
  /** Whom the sender follows in this space; that peer sends its location faster while named here. */
  following?: FollowingTarget;
  deck?: SpaceSchema.PeerDeck;
};

/** Whether `target` names the session `sessionId` of `identityKey`, or names `identityKey` without a session. */
export const isFollowTargetOf = (
  target: FollowingTarget | undefined,
  identityKey: string,
  sessionId: string,
): boolean =>
  target !== undefined &&
  target.identityKey === identityKey &&
  (target.sessionId === undefined || target.sessionId === sessionId);

export const isSameFollowTarget = (a?: SpaceSchema.FollowTarget, b?: SpaceSchema.FollowTarget): boolean =>
  a?.spaceId === b?.spaceId && a?.identityKey === b?.identityKey && a?.sessionId === b?.sessionId;

const isString = (value: unknown): value is string => typeof value === 'string';

// A session id becomes a graph node segment, so it must carry no separator.
const isSessionId = (value: unknown): value is string => isString(value) && /^[A-Za-z0-9_-]{1,64}$/.test(value);

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

const parseFollowing = (value: unknown): FollowingTarget | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { identityKey, sessionId } = value as Record<string, unknown>;
  return isString(identityKey) ? { identityKey, ...(isString(sessionId) && { sessionId }) } : undefined;
};

const parseDeck = (value: unknown): SpaceSchema.PeerDeck | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { planks, front, companions, companionVariant } = value as Record<string, unknown>;
  return Array.isArray(planks)
    ? {
        planks: planks.filter(isString),
        ...(isString(front) && { front }),
        ...(Array.isArray(companions) && { companions: companions.filter(isString) }),
        ...(isString(companionVariant) && { companionVariant }),
      }
    : undefined;
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
  const following = parseFollowing(payload.following);
  const deck = parseDeck(payload.deck);
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
    ...(isSessionId(sessionId) && { sessionId }),
    ...(device && { device }),
    added: added.filter(isString),
    removed: removed.filter(isString),
    attended: Array.isArray(attended) ? attended.filter(isString) : [],
    locations: parsedLocations,
    ...(following && { following }),
    ...(deck && { deck }),
  };
};

const isSameLocation = (a?: SpaceSchema.PeerLocation, b?: SpaceSchema.PeerLocation) =>
  a?.selection === b?.selection && a?.viewport === b?.viewport;

/**
 * Records `peer`'s {@link ViewingMessage} in the viewers map, seen at `lastSeen`. A session has moved when it first
 * opens an object, comes back to it, or its anchor changes there. Sessions of any peer not heard from within
 * {@link PRESENCE_RETENTION} of `lastSeen` are forgotten, since a closed or reloaded tab never sends their removal,
 * and no identity or object is left without sessions.
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
      next[key] = { ...next[key], [peer]: rest };
    }
  }
  return pruneViewers(next, lastSeen);
};

const isRetained = (viewer: SpaceSchema.ObjectViewerProps, now: number) => now - viewer.lastSeen < PRESENCE_RETENTION;

/** `viewersByObject` without lapsed sessions past {@link PRESENCE_RETENTION}, nor the entries they leave empty. */
const pruneViewers = (viewersByObject: ViewersByObject, now: number): ViewersByObject =>
  Object.fromEntries(
    Object.entries(viewersByObject).flatMap(([key, viewers]) => {
      const kept = Object.entries(viewers).flatMap(([viewer, sessions]) => {
        const retained = Object.entries(sessions).filter(([, session]) => isRetained(session, now));
        return retained.length > 0 ? [[viewer, Object.fromEntries(retained)]] : [];
      });
      return kept.length > 0 ? [[key, Object.fromEntries(kept)]] : [];
    }),
  );

/** Records the deck `peer`'s session reported in `spaceId`, replacing the one it reported before. */
export const applyPeerDeck = (
  peerDecks: PeerDecks,
  spaceId: string,
  peer: string,
  { sessionId = peer, deck }: ViewingMessage,
): PeerDecks =>
  deck
    ? {
        ...peerDecks,
        [spaceId]: { ...peerDecks[spaceId], [peer]: { ...peerDecks[spaceId]?.[peer], [sessionId]: deck } },
      }
    : peerDecks;

/** Records whom `peer`'s session follows in `spaceId`, or forgets it once the session's message names nobody. */
export const applyPeerFollowing = (
  peerFollowing: PeerFollowing,
  spaceId: string,
  peer: string,
  { sessionId = peer, following }: ViewingMessage,
): PeerFollowing => {
  const peers = peerFollowing[spaceId] ?? {};
  const sessions = peers[peer] ?? {};
  if (following) {
    return { ...peerFollowing, [spaceId]: { ...peers, [peer]: { ...sessions, [sessionId]: following } } };
  }
  if (!sessions[sessionId]) {
    return peerFollowing;
  }
  const { [sessionId]: _, ...restSessions } = sessions;
  const { [peer]: __, ...restPeers } = peers;
  const nextPeers = Object.keys(restSessions).length > 0 ? { ...restPeers, [peer]: restSessions } : restPeers;
  const { [spaceId]: ___, ...restSpaces } = peerFollowing;
  return Object.keys(nextPeers).length > 0 ? { ...restSpaces, [spaceId]: nextPeers } : restSpaces;
};

/** Per-session values without the sessions no longer listed on any object of their space. */
export const prunePeerSessions = <T>(bySpace: PeerSessions<T>, viewersByObject: ViewersByObject): PeerSessions<T> =>
  Object.fromEntries(
    Object.entries(bySpace).flatMap(([spaceId, peers]) => {
      const listed = Object.entries(viewersByObject).filter(([key]) => isInSpace(key, spaceId));
      const kept = Object.entries(peers).flatMap(([peer, values]) => {
        const sessions = Object.entries(values).filter(([sessionId]) =>
          listed.some(([, viewers]) => viewers[peer]?.[sessionId]),
        );
        return sessions.length > 0 ? [[peer, Object.fromEntries(sessions)]] : [];
      });
      return kept.length > 0 ? [[spaceId, Object.fromEntries(kept)]] : [];
    }),
  );

/** The graph path a session of `peer` has the object `key` open at in its deck, when it reported one. */
export const getPeerPlankPath = (
  peerDecks: PeerDecks,
  spaceId: string,
  peer: string,
  sessionId: string,
  key: EID.EID,
): string | undefined =>
  peerDecks[spaceId]?.[peer]?.[sessionId]?.planks.find((path) => getPresenceKeyFromPath(path) === key);

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

/** Graph nodes of the peers with a fresh session on an object, and of those sessions. */
export const getPeerNodeIds = (spaceId: string, viewers: ObjectViewers | undefined, now: number): string[] =>
  Object.entries(viewers ?? {}).flatMap(([identityKey, sessions]) => {
    const fresh = getFreshSessions(sessions, now);
    return fresh.length > 0
      ? [
          getPeerNodeId(spaceId, identityKey),
          ...fresh.map(({ sessionId }) => getSessionNodeId(spaceId, identityKey, sessionId)),
        ]
      : [];
  });

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
 * that moved most recently; with `objectKey`, only that object.
 */
export const getPeerFocus = (
  viewersByObject: ViewersByObject,
  spaceId: string,
  peer: string,
  now: number,
  sessionId?: string,
  objectKey?: EID.EID,
): PeerFocus | undefined => {
  let focus: (PeerFocus & { movedAt: number }) | undefined;
  for (const [key, viewers] of Object.entries(viewersByObject)) {
    const eid = EID.tryParse(key);
    if (!eid || EID.getSpaceId(eid) !== spaceId || (objectKey !== undefined && eid !== objectKey)) {
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

/** A session in a follow, by identity and session. */
export type FollowSession = { identityKey: string; sessionId: string };

/** The follow this session takes part in within one space: one leader and every follower of theirs. */
export type FollowGroup = {
  spaceId: string;
  /** The leader's hex identity key. */
  leader: string;
  /** The leader session the follow tracks right now, when known. */
  leaderSessionId?: string;
  /** Whether this session is the leader. */
  leading: boolean;
  /** Every session following the leader other than this one. */
  followers: FollowSession[];
};

export type GetFollowGroupProps = {
  spaceId: string;
  identityKey: string;
  sessionId: string;
  following?: SpaceSchema.FollowTarget;
  peerFollowing: PeerFollowing;
  viewersByObject: ViewersByObject;
  now: number;
};

// Follow targets are kept as long as the session is retained, which outlasts its presence.
const isSessionFresh = (
  viewersByObject: ViewersByObject,
  spaceId: string,
  peer: string,
  sessionId: string,
  now: number,
) =>
  Object.entries(viewersByObject).some(([key, viewers]) => {
    const session = viewers[peer]?.[sessionId];
    return !!session && isInSpace(key, spaceId) && isFresh(session, now);
  });

/**
 * The follow this session takes part in within the space: the one it follows, with that leader's other followers, or
 * else the one it leads, when any fresh session names it. Undefined when it takes part in none.
 */
export const getFollowGroup = ({
  spaceId,
  identityKey,
  sessionId,
  following,
  peerFollowing,
  viewersByObject,
  now,
}: GetFollowGroupProps): FollowGroup | undefined => {
  const peers = Object.entries(peerFollowing[spaceId] ?? {});
  const followersOf = (matches: (target: FollowingTarget) => boolean): FollowSession[] =>
    peers.flatMap(([peer, sessions]) =>
      Object.entries(sessions)
        .filter(
          ([session, target]) =>
            !(peer === identityKey && session === sessionId) &&
            matches(target) &&
            isSessionFresh(viewersByObject, spaceId, peer, session, now),
        )
        .map(([session]) => ({ identityKey: peer, sessionId: session })),
    );

  if (following?.spaceId === spaceId) {
    const leaderSessionId =
      following.sessionId ?? getPeerFocus(viewersByObject, spaceId, following.identityKey, now)?.sessionId;
    return {
      spaceId,
      leader: following.identityKey,
      ...(leaderSessionId && { leaderSessionId }),
      leading: false,
      followers: followersOf(
        (target) =>
          target.identityKey === following.identityKey &&
          (target.sessionId === undefined || leaderSessionId === undefined || target.sessionId === leaderSessionId),
      ),
    };
  }

  const followers = followersOf((target) => isFollowTargetOf(target, identityKey, sessionId));
  return followers.length > 0
    ? { spaceId, leader: identityKey, leaderSessionId: sessionId, leading: true, followers }
    : undefined;
};

/** The identity keys in a follow group other than `identityKey`: the leader and every follower. */
export const getFollowGroupMembers = (group: FollowGroup, identityKey: string): ReadonlySet<string> =>
  new Set(
    [group.leader, ...group.followers.map((follower) => follower.identityKey)].filter((key) => key !== identityKey),
  );

export type LocationScheduler = {
  /** Notes that `key`'s location may have changed; a change goes out with the next send. */
  schedule: (key: string) => void;
  dispose: () => void;
};

/**
 * Batches location changes of `keys` into one send per `interval()` ({@link LOCATION_BROADCAST_INTERVAL} by default),
 * to the spaces of the keys whose location differs from the last one seen, so an unchanged location (a remote edit, a
 * resize) sends nothing.
 */
export const makeLocationScheduler = (
  keys: readonly string[],
  read: (key: string) => SpaceSchema.PeerLocation | undefined,
  send: (spaceIds: ReadonlySet<string>) => void,
  interval: () => number = () => LOCATION_BROADCAST_INTERVAL,
): LocationScheduler => {
  const seen = new Map(keys.map((key) => [key, read(key)]));
  const pending = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule: (key) => {
      const location = read(key);
      const eid = EID.tryParse(key);
      const spaceId = eid && EID.getSpaceId(eid);
      if (isSameLocation(seen.get(key), location) || !spaceId) {
        return;
      }
      seen.set(key, location);
      pending.add(spaceId);
      timer ??= setTimeout(() => {
        timer = undefined;
        const spaceIds = new Set(pending);
        pending.clear();
        send(spaceIds);
      }, interval());
    },
    dispose: () => clearTimeout(timer),
  };
};
