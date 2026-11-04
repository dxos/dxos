//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import {
  applyViewingMessage,
  getPeerFocus,
  getPresenceKeyFromPath,
  groupPresenceChangesBySpace,
  groupPresenceKeysBySpace,
  parseViewingMessage,
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
        device: 7,
        added: [key, 7],
        removed: [],
        attended: [key],
        locations: { [key]: { selection: 'a:b', viewport: 3 }, [other]: {} },
      }),
    ).toEqual({
      identityKey: 'peer',
      sessionId: 's1',
      added: [key],
      removed: [],
      attended: [key],
      locations: { [key]: { selection: 'a:b' } },
    });
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
      applyViewingMessage(closed, 'peer', { ...message, sessionId: 's2', added: [], removed: [key] }, 2)[key],
    ).toEqual({});
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
});
