//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';

import { Key } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Listbox } from '@dxos/react-ui-list';

import { type Member, PresenceItems, getPresenceRows } from './PresenceList.tsx';

const member: Member = {
  identityKey: 'a'.repeat(64),
  role: 'edit',
  online: true,
  rowId: 'peer',
  now: 10,
  sessions: [
    { sessionId: 'newest', lastSeen: 10, movedAt: 9, currentlyAttended: true },
    { sessionId: 'older', lastSeen: 10, movedAt: 5, currentlyAttended: true },
  ],
};

/** The session each row asks for its actions on, in row order; `undefined` for the person themself. */
const renderedTargets = (showSessions: boolean) => {
  const targets: (string | undefined)[] = [];
  renderToStaticMarkup(
    <Listbox.Root items={[]}>
      <PresenceItems
        member={member}
        showSessions={showSessions}
        renderActions={(_member, sessionId) => {
          targets.push(sessionId);
          return null;
        }}
      />
    </Listbox.Root>,
  );
  return targets;
};

describe('PresenceItems', () => {
  test('a person’s row acts on the person, so Follow tracks whichever session moves', ({ expect }) => {
    expect(renderedTargets(false)).toEqual([undefined]);
  });

  test('each session’s row acts on that session', ({ expect }) => {
    expect(renderedTargets(true)).toEqual(['newest', 'older']);
  });
});

describe('getPresenceRows', () => {
  const spaceId = Key.SpaceId.random();
  const doc = EID.make({ spaceId, entityId: Key.EntityId.random() });
  const sheet = EID.make({ spaceId, entityId: Key.EntityId.random() });
  const [self, leader, follower, moved] = ['1', '2', '3', '4'].map((digit) => ({
    identityKey: digit.repeat(64),
    role: 'edit' as const,
    online: true,
  }));
  const now = 10;
  const viewer = (currentlyAttended: boolean) => ({ s: { lastSeen: now, movedAt: now, currentlyAttended } });
  // `moved` left the doc for the sheet; their doc session has not lapsed yet.
  const viewersByObject = {
    [doc]: {
      [leader.identityKey]: viewer(true),
      [follower.identityKey]: viewer(true),
      [moved.identityKey]: viewer(false),
    },
    [sheet]: { [moved.identityKey]: viewer(true) },
  };
  const rows = (objectKey?: EID.EID) =>
    getPresenceRows({
      spaceId,
      objectKey,
      viewersByObject,
      members: [self, leader, follower, moved],
      identityKey: self.identityKey,
      leaderKey: leader.identityKey,
      followerKeys: new Set([follower.identityKey]),
      now,
    });

  test('the space’s list puts each person under what they attend now, the follow apart', ({ expect }) => {
    const { leader: first, followers, groups } = rows();
    expect(first?.identityKey).toBe(leader.identityKey);
    expect(followers.map((member) => member.identityKey)).toEqual([follower.identityKey]);
    expect(groups.map((group) => [group.objectKey, group.members.map((member) => member.identityKey)])).toEqual([
      [sheet, [moved.identityKey]],
    ]);
  });

  test('one object’s list keeps a session that moved on until it lapses, as its avatars do', ({ expect }) => {
    expect(rows(doc).groups.map((group) => group.members.map((member) => member.identityKey))).toEqual([
      [moved.identityKey],
    ]);
    expect(rows(sheet).leader).toBeUndefined();
  });
});
