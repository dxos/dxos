//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import {
  FOLLOW_BROADCAST_INTERVAL,
  LOCATION_BROADCAST_INTERVAL,
  PRESENCE_EXPIRY,
  PRESENCE_RETENTION,
  applyPeerDeck,
  applyPeerFollowing,
  applyViewingMessage,
  getFollowGroup,
  getFollowGroupMembers,
  getPeerFocus,
  getPeerNodeId,
  getPeerNodeIds,
  getPeerPlankPath,
  getPresenceKeyFromPath,
  getSessionNodeId,
  groupPresenceChangesBySpace,
  groupPresenceKeysBySpace,
  isFollowTargetOf,
  makeLocationScheduler,
  parseViewingMessage,
  prunePeerSessions,
} from './presence.ts';

const spaceId = Key.SpaceId.random();
const otherSpaceId = Key.SpaceId.random();
const objectId = Key.EntityId.random();
const childId = Key.EntityId.random();

describe('getPresenceKeyFromPath', () => {
  test('keys a path by its innermost object', ({ expect }) => {
    expect(getPresenceKeyFromPath(`root/${spaceId}/collections/${objectId}/${childId}`)).toBe(
      EID.make({ spaceId, entityId: childId }),
    );
    expect(getPresenceKeyFromPath(`root/${spaceId}/content/${objectId}/comments`)).toBe(
      EID.make({ spaceId, entityId: objectId }),
    );
  });

  test('keys a path naming no object by its space', ({ expect }) => {
    expect(getPresenceKeyFromPath(`root/${spaceId}`)).toBe(EID.make({ spaceId }));
    expect(getPresenceKeyFromPath(`root/${spaceId}/settings`)).toBe(EID.make({ spaceId }));
  });

  test('drops a path outside any space', ({ expect }) => {
    expect(getPresenceKeyFromPath('root/settings')).toBeUndefined();
  });
});

describe('groupPresenceKeysBySpace', () => {
  test('groups keys by space', ({ expect }) => {
    const grouped = groupPresenceKeysBySpace([
      `root/${spaceId}/${objectId}`,
      `root/${otherSpaceId}`,
      `root/${spaceId}/${childId}`,
      'root/settings',
    ]);
    expect(Object.fromEntries(grouped)).toEqual({
      [spaceId]: [EID.make({ spaceId, entityId: objectId }), EID.make({ spaceId, entityId: childId })],
      [otherSpaceId]: [EID.make({ spaceId: otherSpaceId })],
    });
  });
});

describe('groupPresenceChangesBySpace', () => {
  test('keeps a key added when an inactive path resolves to it too', ({ expect }) => {
    const changes = groupPresenceChangesBySpace(
      [`root/${spaceId}/collections/${objectId}`],
      [`root/${spaceId}/content/${objectId}`, `root/${spaceId}/${childId}`],
    );
    expect(Object.fromEntries(changes)).toEqual({
      [spaceId]: {
        added: [EID.make({ spaceId, entityId: objectId })],
        removed: [EID.make({ spaceId, entityId: childId })],
      },
    });
  });
});

describe('parseViewingMessage', () => {
  test('keeps well-formed locations and drops the rest', ({ expect }) => {
    const key = EID.make({ spaceId, entityId: objectId });
    const other = EID.make({ spaceId, entityId: childId });
    expect(
      parseViewingMessage({
        identityKey: 'peer',
        sessionId: 's1',
        device: { platform: 'Chrome', kind: 'toaster', os: 7 },
        added: [key, 7],
        removed: [],
        attended: [key],
        locations: { [key]: { selection: 'a:b', viewport: 3 }, [other]: {} },
        deck: { planks: ['root/a', 7] },
      }),
    ).toEqual({
      identityKey: 'peer',
      sessionId: 's1',
      device: { platform: 'Chrome' },
      added: [key],
      removed: [],
      attended: [key],
      locations: { [key]: { selection: 'a:b' } },
      deck: { planks: ['root/a'] },
    });
  });

  test("keeps a deck's front plank and drops a malformed one", ({ expect }) => {
    const message = { identityKey: 'peer', added: [], removed: [] };
    expect(parseViewingMessage({ ...message, deck: { planks: ['root/a'], front: 'root/a' } })?.deck).toEqual({
      planks: ['root/a'],
      front: 'root/a',
    });
    expect(parseViewingMessage({ ...message, deck: { planks: ['root/a'], front: 7 } })?.deck).toEqual({
      planks: ['root/a'],
    });
  });

  test('keeps a well-formed follow target and drops a malformed one', ({ expect }) => {
    const message = { identityKey: 'peer', added: [], removed: [] };
    expect(parseViewingMessage({ ...message, following: { identityKey: 'leader', sessionId: 7 } })?.following).toEqual({
      identityKey: 'leader',
    });
    expect(parseViewingMessage({ ...message, following: { sessionId: 's1' } })?.following).toBeUndefined();
  });

  test('drops a session id that could not name a graph segment', ({ expect }) => {
    const message = { identityKey: 'peer', added: [], removed: [] };
    expect(parseViewingMessage({ ...message, sessionId: 'a/b' })).not.toHaveProperty('sessionId');
    expect(parseViewingMessage({ ...message, sessionId: '' })).not.toHaveProperty('sessionId');
    expect(parseViewingMessage({ ...message, sessionId: 'f'.repeat(65) })).not.toHaveProperty('sessionId');
    expect(parseViewingMessage({ ...message, sessionId: 'f'.repeat(64) })?.sessionId).toBe('f'.repeat(64));
  });

  test('rejects a message without an identity or deltas', ({ expect }) => {
    expect(parseViewingMessage({ added: [], removed: [] })).toBeUndefined();
    expect(parseViewingMessage({ identityKey: 'peer' })).toBeUndefined();
  });
});

describe('applyViewingMessage', () => {
  const key = EID.make({ spaceId, entityId: objectId });
  const message = { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} };

  test('records the location of an attended object and clears it once the session moves on', ({ expect }) => {
    const located = applyViewingMessage({}, 'peer', { ...message, locations: { [key]: { selection: 'a:a' } } }, 1);
    expect(located[key].peer.s1).toEqual({
      lastSeen: 1,
      movedAt: 1,
      currentlyAttended: true,
      location: { selection: 'a:a' },
    });
    expect(applyViewingMessage(located, 'peer', { ...message, attended: [] }, 2)[key].peer.s1).toEqual({
      lastSeen: 2,
      movedAt: 1,
      currentlyAttended: false,
    });
  });

  test('marks a session moved only when its anchor changes', ({ expect }) => {
    const at = (selection: string, lastSeen: number, viewers = {}) =>
      applyViewingMessage(viewers, 'peer', { ...message, locations: { [key]: { selection } } }, lastSeen);
    const still = at('a:a', 2, at('a:a', 1));
    expect(still[key].peer.s1.movedAt).toBe(1);
    expect(at('a:b', 3, still)[key].peer.s1.movedAt).toBe(3);
  });

  test('keeps sessions of one identity apart, and counts a message without a session as the identity', ({ expect }) => {
    const viewers = applyViewingMessage(
      applyViewingMessage({}, 'peer', message, 1),
      'peer',
      { ...message, sessionId: 's2' },
      2,
    );
    expect(Object.keys(viewers[key].peer)).toEqual(['s1', 's2']);
    const { sessionId: _, ...legacy } = message;
    expect(Object.keys(applyViewingMessage({}, 'peer', legacy, 1)[key].peer)).toEqual(['peer']);
  });

  test('forgets sessions of any peer not heard from within the retention, with their emptied entries', ({ expect }) => {
    const other = EID.make({ spaceId, entityId: childId });
    const stale = applyViewingMessage(
      applyViewingMessage({}, 'peer', message, 1),
      'friend',
      { ...message, identityKey: 'friend', added: [other] },
      1,
    );
    const later = 1 + PRESENCE_RETENTION;
    const viewers = applyViewingMessage(stale, 'peer', { ...message, sessionId: 's2' }, later);
    expect(viewers[key]).toEqual({ peer: { s2: expect.objectContaining({ lastSeen: later }) } });
    expect(viewers).not.toHaveProperty(other);
  });

  test('keeps when a session last moved across a heartbeat gap longer than the expiry', ({ expect }) => {
    const located = { ...message, locations: { [key]: { selection: 'a:a' } } };
    const gap = 1 + PRESENCE_EXPIRY + 1;
    const viewers = applyViewingMessage(
      applyViewingMessage(
        applyViewingMessage({}, 'peer', located, 1),
        'friend',
        { ...message, identityKey: 'friend' },
        gap,
      ),
      'peer',
      located,
      gap + 1,
    );
    expect(viewers[key].peer.s1.movedAt).toBe(1);
  });

  test('removes the session from objects it closed, and the peer with its last session', ({ expect }) => {
    const viewers = applyViewingMessage(
      applyViewingMessage({}, 'peer', message, 1),
      'peer',
      { ...message, sessionId: 's2' },
      1,
    );
    const closed = applyViewingMessage(viewers, 'peer', { ...message, added: [], removed: [key] }, 2);
    expect(Object.keys(closed[key].peer)).toEqual(['s2']);
    expect(
      applyViewingMessage(closed, 'peer', { ...message, sessionId: 's2', added: [], removed: [key] }, 2),
    ).not.toHaveProperty(key);
  });
});

describe('getPeerFocus', () => {
  const key = EID.make({ spaceId, entityId: objectId });
  const other = EID.make({ spaceId, entityId: childId });
  const viewers = applyViewingMessage(
    applyViewingMessage(
      {},
      'peer',
      { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} },
      1,
    ),
    'peer',
    { identityKey: 'peer', sessionId: 's2', added: [other], removed: [], attended: [other], locations: {} },
    2,
  );

  test('follows the session that moved most recently, or the one asked for', ({ expect }) => {
    expect(getPeerFocus(viewers, spaceId, 'peer', 3)).toEqual({ key: other, sessionId: 's2', location: undefined });
    expect(getPeerFocus(viewers, spaceId, 'peer', 3, 's1')).toEqual({ key, sessionId: 's1', location: undefined });
  });

  test('keeps to the object asked for when a session attends several', ({ expect }) => {
    const nested = applyViewingMessage(
      applyViewingMessage(
        {},
        'peer',
        { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} },
        1,
      ),
      'peer',
      {
        identityKey: 'peer',
        sessionId: 's1',
        added: [key, other],
        removed: [],
        attended: [key, other],
        locations: { [other]: { selection: 'a:a' } },
      },
      2,
    );
    expect(getPeerFocus(nested, spaceId, 'peer', 3, 's1')?.key).toBe(other);
    expect(getPeerFocus(nested, spaceId, 'peer', 3, 's1', key)).toEqual({ key, sessionId: 's1', location: undefined });
    expect(getPeerFocus(nested, spaceId, 'peer', 3, undefined, key)?.key).toBe(key);
  });
});

describe('getPeerNodeIds', () => {
  test('names the nodes of peers and sessions still fresh on the object, and none for a lapsed peer', ({ expect }) => {
    const key = EID.make({ spaceId, entityId: objectId });
    const message = { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} };
    const viewers = applyViewingMessage(
      applyViewingMessage({}, 'friend', { ...message, identityKey: 'friend' }, 1),
      'peer',
      message,
      1 + PRESENCE_EXPIRY,
    );
    expect(getPeerNodeIds(spaceId, viewers[key], 1 + PRESENCE_EXPIRY)).toEqual([
      getPeerNodeId(spaceId, 'peer'),
      getSessionNodeId(spaceId, 'peer', 's1'),
    ]);
  });
});

describe('prunePeerSessions', () => {
  test("keeps only the decks of sessions still listed on an object in the deck's space", ({ expect }) => {
    const key = EID.make({ spaceId, entityId: objectId });
    const message = { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} };
    const deck = { planks: [`root/${spaceId}/${objectId}`] };
    const decks = applyPeerDeck(applyPeerDeck({}, spaceId, 'peer', { ...message, deck }), spaceId, 'peer', {
      ...message,
      sessionId: 's2',
      deck,
    });
    const viewers = applyViewingMessage({}, 'peer', message, 1);
    expect(prunePeerSessions(decks, viewers)).toEqual({ [spaceId]: { peer: { s1: deck } } });
    expect(prunePeerSessions(decks, {})).toEqual({});
  });
});

describe('applyPeerFollowing', () => {
  const key = EID.make({ spaceId, entityId: objectId });
  const message = { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} };

  test('records whom a session follows and forgets it once the session names nobody', ({ expect }) => {
    const following = applyPeerFollowing({}, spaceId, 'peer', { ...message, following: { identityKey: 'leader' } });
    expect(following).toEqual({ [spaceId]: { peer: { s1: { identityKey: 'leader' } } } });
    expect(applyPeerFollowing(following, spaceId, 'peer', message)).toEqual({});
  });

  test('leaves other sessions of the peer alone', ({ expect }) => {
    const both = applyPeerFollowing(
      applyPeerFollowing({}, spaceId, 'peer', { ...message, following: { identityKey: 'leader' } }),
      spaceId,
      'peer',
      { ...message, sessionId: 's2', following: { identityKey: 'leader' } },
    );
    expect(applyPeerFollowing(both, spaceId, 'peer', message)).toEqual({
      [spaceId]: { peer: { s2: { identityKey: 'leader' } } },
    });
  });
});

describe('getFollowGroup', () => {
  const key = EID.make({ spaceId, entityId: objectId });
  const now = 1_000_000;
  const view = (viewers: Parameters<typeof applyViewingMessage>[0], peer: string, sessionId: string, lastSeen = now) =>
    applyViewingMessage(
      viewers,
      peer,
      { identityKey: peer, sessionId, added: [key], removed: [], attended: [key], locations: {} },
      lastSeen,
    );
  const viewersByObject = [
    ['leader', 'l1'],
    ['bob', 'b1'],
    ['carol', 'c1'],
  ].reduce((viewers, [peer, sessionId]) => view(viewers, peer, sessionId), {});
  const peerFollowing = {
    [spaceId]: { bob: { b1: { identityKey: 'leader' } }, carol: { c1: { identityKey: 'leader', sessionId: 'l1' } } },
  };

  test('a leader sees every session that follows it', ({ expect }) => {
    const group = getFollowGroup({
      spaceId,
      identityKey: 'leader',
      sessionId: 'l1',
      peerFollowing,
      viewersByObject,
      now,
    });
    expect(group).toEqual({
      spaceId,
      leader: 'leader',
      leaderSessionId: 'l1',
      leading: true,
      followers: [
        { identityKey: 'bob', sessionId: 'b1' },
        { identityKey: 'carol', sessionId: 'c1' },
      ],
    });
    expect(group && [...getFollowGroupMembers(group, 'leader')]).toEqual(['bob', 'carol']);
  });

  test('a follower of the person counts only in the group of the session they track', ({ expect }) => {
    // The leader's l1 moved last, so Bob, who follows the leader as a person, tracks l1; Carol follows l2 itself.
    const twoSessions = view(view(viewersByObject, 'leader', 'l2', now - 1_000), 'leader', 'l1', now);
    const following = {
      [spaceId]: { bob: { b1: { identityKey: 'leader' } }, carol: { c1: { identityKey: 'leader', sessionId: 'l2' } } },
    };
    const carolGroup = getFollowGroup({
      spaceId,
      identityKey: 'carol',
      sessionId: 'c1',
      following: { spaceId, identityKey: 'leader', sessionId: 'l2' },
      peerFollowing: following,
      viewersByObject: twoSessions,
      now,
    });
    expect(carolGroup?.followers).toEqual([]);
    const l2Group = getFollowGroup({
      spaceId,
      identityKey: 'leader',
      sessionId: 'l2',
      peerFollowing: following,
      viewersByObject: twoSessions,
      now,
    });
    expect(l2Group?.followers).toEqual([{ identityKey: 'carol', sessionId: 'c1' }]);
  });

  test('a follower sees its leader and the other followers', ({ expect }) => {
    const group = getFollowGroup({
      spaceId,
      identityKey: 'bob',
      sessionId: 'b1',
      following: { spaceId, identityKey: 'leader' },
      peerFollowing,
      viewersByObject,
      now,
    });
    expect(group).toMatchObject({ leader: 'leader', leaderSessionId: 'l1', leading: false });
    expect(group?.followers).toEqual([{ identityKey: 'carol', sessionId: 'c1' }]);
    expect(group && [...getFollowGroupMembers(group, 'bob')]).toEqual(['leader', 'carol']);
  });

  test('a follower whose presence lapsed drops out of the group', ({ expect }) => {
    const lapsed = view(viewersByObject, 'carol', 'c1', now - PRESENCE_EXPIRY);
    const group = getFollowGroup({
      spaceId,
      identityKey: 'leader',
      sessionId: 'l1',
      peerFollowing,
      viewersByObject: lapsed,
      now,
    });
    expect(group?.followers).toEqual([{ identityKey: 'bob', sessionId: 'b1' }]);
  });

  test('a session in no follow has no group', ({ expect }) => {
    expect(
      getFollowGroup({ spaceId, identityKey: 'dan', sessionId: 'd1', peerFollowing, viewersByObject, now }),
    ).toBeUndefined();
    expect(
      getFollowGroup({
        spaceId: otherSpaceId,
        identityKey: 'leader',
        sessionId: 'l1',
        peerFollowing,
        viewersByObject,
        now,
      }),
    ).toBeUndefined();
  });
});

describe('makeLocationScheduler', () => {
  const key = EID.make({ spaceId, entityId: objectId });
  const otherKey = EID.make({ spaceId: otherSpaceId, entityId: childId });

  test('sends once per interval, to the spaces whose locations changed, and not for an unchanged one', ({ expect }) => {
    vi.useFakeTimers();
    try {
      const locations: Record<string, { selection: string }> = { [key]: { selection: 'a:a' } };
      const send = vi.fn();
      const scheduler = makeLocationScheduler([key, otherKey], (key) => locations[key], send);

      locations[key] = { selection: 'a:a' };
      scheduler.schedule(key);
      vi.advanceTimersByTime(LOCATION_BROADCAST_INTERVAL);
      expect(send).not.toHaveBeenCalled();

      locations[key] = { selection: 'a:b' };
      scheduler.schedule(key);
      scheduler.schedule(key);
      vi.advanceTimersByTime(LOCATION_BROADCAST_INTERVAL);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenLastCalledWith(new Set([spaceId]));

      scheduler.schedule(key);
      locations[otherKey] = { selection: 'b:b' };
      scheduler.schedule(otherKey);
      scheduler.dispose();
      vi.advanceTimersByTime(LOCATION_BROADCAST_INTERVAL);
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test('reads its interval when a send is scheduled, so a session that gains a follower speeds up', ({ expect }) => {
    vi.useFakeTimers();
    try {
      let followed = false;
      const locations: Record<string, { selection: string }> = {};
      const send = vi.fn();
      const scheduler = makeLocationScheduler(
        [key],
        (key) => locations[key],
        send,
        () => (followed ? FOLLOW_BROADCAST_INTERVAL : LOCATION_BROADCAST_INTERVAL),
      );

      followed = true;
      locations[key] = { selection: 'a:b' };
      scheduler.schedule(key);
      vi.advanceTimersByTime(FOLLOW_BROADCAST_INTERVAL - 1);
      expect(send).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(send).toHaveBeenCalledTimes(1);
      scheduler.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('isFollowTargetOf', () => {
  test('names every session of a peer followed as a person, and only the one session when pinned', ({ expect }) => {
    expect(isFollowTargetOf({ identityKey: 'leader' }, 'leader', 's1')).toBe(true);
    expect(isFollowTargetOf({ identityKey: 'leader', sessionId: 's1' }, 'leader', 's1')).toBe(true);
    expect(isFollowTargetOf({ identityKey: 'leader', sessionId: 's1' }, 'leader', 's2')).toBe(false);
    expect(isFollowTargetOf({ identityKey: 'other' }, 'leader', 's1')).toBe(false);
    expect(isFollowTargetOf(undefined, 'leader', 's1')).toBe(false);
  });
});

describe('getPeerPlankPath', () => {
  test('finds the path a session has the object open at, and nothing for a session that sent no deck', ({ expect }) => {
    const key = EID.make({ spaceId, entityId: childId });
    const path = `root/${spaceId}/content/collections/${objectId}/${childId}`;
    const message = { identityKey: 'peer', sessionId: 's1', added: [key], removed: [], attended: [key], locations: {} };
    const decks = applyPeerDeck({}, spaceId, 'peer', { ...message, deck: { planks: [`root/${spaceId}/home`, path] } });
    expect(getPeerPlankPath(decks, spaceId, 'peer', 's1', key)).toBe(path);
    expect(getPeerPlankPath(applyPeerDeck(decks, spaceId, 'peer', message), spaceId, 'peer', 's1', key)).toBe(path);
    expect(getPeerPlankPath(decks, spaceId, 'peer', 's2', key)).toBeUndefined();
  });
});
