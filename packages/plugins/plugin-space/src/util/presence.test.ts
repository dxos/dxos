//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { getPresenceKeyFromPath, groupPresenceChangesBySpace, groupPresenceKeysBySpace } from './presence.ts';

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
