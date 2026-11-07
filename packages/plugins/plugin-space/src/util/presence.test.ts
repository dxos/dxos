//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import {
  LOCATION_BROADCAST_INTERVAL,
  PRESENCE_EXPIRY,
  PRESENCE_RETENTION,
  applyPeerDeck,
  applyViewingMessage,
  getPeerFocus,
  getPeerNodeId,
  getPeerNodeIds,
  getPeerPlankPath,
  getPresenceKeyFromPath,
  getSessionNodeId,
  groupPresenceChangesBySpace,
  groupPresenceKeysBySpace,
  makeLocationScheduler,
  parseViewingMessage,
  prunePeerDecks,
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

describe('prunePeerDecks', () => {
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
    expect(prunePeerDecks(decks, viewers)).toEqual({ [spaceId]: { peer: { s1: deck } } });
    expect(prunePeerDecks(decks, {})).toEqual({});
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
