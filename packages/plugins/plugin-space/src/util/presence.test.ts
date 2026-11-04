//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import {
  applyViewingMessage,
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
        added: [key, 7],
        removed: [],
        attended: [key],
        locations: { [key]: { selection: 'a:b', viewport: 3 }, [other]: {} },
      }),
    ).toEqual({
      identityKey: 'peer',
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
  const message = { identityKey: 'peer', added: [key], removed: [], attended: [key], locations: {} };

  test('records the location of an attended object and clears it once the peer moves on', ({ expect }) => {
    const located = applyViewingMessage({}, 'peer', { ...message, locations: { [key]: { selection: 'a:a' } } }, 1);
    expect(located[key].peer).toEqual({ lastSeen: 1, currentlyAttended: true, location: { selection: 'a:a' } });
    expect(applyViewingMessage(located, 'peer', { ...message, attended: [] }, 2)[key].peer).toEqual({
      lastSeen: 2,
      currentlyAttended: false,
    });
  });

  test('removes the peer from objects it closed', ({ expect }) => {
    const viewers = applyViewingMessage({}, 'peer', message, 1);
    expect(applyViewingMessage(viewers, 'peer', { ...message, added: [], removed: [key] }, 2)[key]).toEqual({});
  });
});
