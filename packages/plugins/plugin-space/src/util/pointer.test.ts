//
// Copyright 2026 DXOS.org
//

import { assert, describe, test } from 'vitest';

import {
  type FollowPointer,
  type PointerViewer,
  fromPlankPosition,
  getPointerAnchor,
  sharesFollow,
  takesPartInFollow,
  toPlankPosition,
} from './pointer.ts';

const SPACE = 'space-1';
const LEADER = 'a'.repeat(64);
const FOLLOWER = 'b'.repeat(64);
const OTHER = 'c'.repeat(64);

describe('plank position', () => {
  test('maps a point to the same spot of a plank sized differently', ({ expect }) => {
    const leaderBox = { left: 300, top: 50, width: 600, height: 800 };
    const followerBox = { left: 40, top: 100, width: 400, height: 500 };
    const position = toPlankPosition(leaderBox, 450, 250);
    expect(position).toEqual({ x: 0.25, y: 0.25 });
    assert(position);
    expect(fromPlankPosition(followerBox, position)).toEqual({ left: 140, top: 225 });
  });

  test('round-trips through the same box', ({ expect }) => {
    const box = { left: 12.5, top: 7, width: 333, height: 211 };
    const position = toPlankPosition(box, 100, 150);
    assert(position);
    const { left, top } = fromPlankPosition(box, position);
    expect(left).toBeCloseTo(100);
    expect(top).toBeCloseTo(150);
  });

  test('clamps a point outside the box to its edge', ({ expect }) => {
    const box = { left: 0, top: 0, width: 100, height: 100 };
    expect(toPlankPosition(box, -20, 140)).toEqual({ x: 0, y: 1 });
    expect(fromPlankPosition(box, { x: 2, y: -1 })).toEqual({ left: 100, top: 0 });
  });

  test('has no position in an empty box', ({ expect }) => {
    expect(toPlankPosition({ left: 0, top: 0, width: 0, height: 100 }, 0, 0)).toBeUndefined();
  });
});

describe('sharesFollow', () => {
  const pointer = (sessionId: string, following?: FollowPointer['following']): FollowPointer => ({
    sessionId,
    ...(following && { following }),
    plank: 'root/space-1/doc',
    x: 0.5,
    y: 0.5,
  });

  const follower: PointerViewer = {
    spaceId: SPACE,
    identityKey: FOLLOWER,
    sessionId: 'f1',
    following: { spaceId: SPACE, identityKey: LEADER },
    leaderSessionId: 'l1',
  };

  const leader: PointerViewer = { spaceId: SPACE, identityKey: LEADER, sessionId: 'l1' };

  test('a follower sees the session of the leader its follow tracks, and no other', ({ expect }) => {
    expect(sharesFollow(follower, { identityKey: LEADER, pointer: pointer('l1') })).toBe(true);
    expect(sharesFollow(follower, { identityKey: LEADER, pointer: pointer('l2') })).toBe(false);
  });

  test('a follow of one session sees that session', ({ expect }) => {
    const viewer = { ...follower, following: { spaceId: SPACE, identityKey: LEADER, sessionId: 'l2' } };
    expect(sharesFollow(viewer, { identityKey: LEADER, pointer: pointer('l2') })).toBe(true);
    expect(sharesFollow(viewer, { identityKey: LEADER, pointer: pointer('l1') })).toBe(false);
  });

  test('a leader sees the sessions that follow it', ({ expect }) => {
    expect(sharesFollow(leader, { identityKey: FOLLOWER, pointer: pointer('f1', { identityKey: LEADER }) })).toBe(true);
    expect(
      sharesFollow(leader, { identityKey: FOLLOWER, pointer: pointer('f1', { identityKey: LEADER, sessionId: 'l1' }) }),
    ).toBe(true);
    expect(
      sharesFollow(leader, { identityKey: FOLLOWER, pointer: pointer('f1', { identityKey: LEADER, sessionId: 'l9' }) }),
    ).toBe(false);
  });

  test('followers of one leader see each other', ({ expect }) => {
    expect(sharesFollow(follower, { identityKey: OTHER, pointer: pointer('o1', { identityKey: LEADER }) })).toBe(true);
    expect(
      sharesFollow(follower, { identityKey: OTHER, pointer: pointer('o1', { identityKey: LEADER, sessionId: 'l1' }) }),
    ).toBe(false);
  });

  test('a session outside the follow sees nobody, and nobody sees it', ({ expect }) => {
    const bystander: PointerViewer = { spaceId: SPACE, identityKey: OTHER, sessionId: 'o1' };
    expect(sharesFollow(bystander, { identityKey: LEADER, pointer: pointer('l1') })).toBe(false);
    expect(sharesFollow(bystander, { identityKey: FOLLOWER, pointer: pointer('f1', { identityKey: LEADER }) })).toBe(
      false,
    );
    expect(sharesFollow(leader, { identityKey: OTHER, pointer: pointer('o1') })).toBe(false);
  });

  test('a follow in another space shares nothing here', ({ expect }) => {
    const viewer = { ...follower, following: { spaceId: 'space-2', identityKey: LEADER } };
    expect(sharesFollow(viewer, { identityKey: LEADER, pointer: pointer('l1') })).toBe(false);
  });

  test('a session never draws its own pointer', ({ expect }) => {
    expect(sharesFollow(leader, { identityKey: LEADER, pointer: pointer('l1', { identityKey: LEADER }) })).toBe(false);
  });
});

describe('takesPartInFollow', () => {
  test('posts while following or followed in the space', ({ expect }) => {
    expect(takesPartInFollow(SPACE, { spaceId: SPACE, identityKey: LEADER }, [])).toBe(true);
    expect(takesPartInFollow(SPACE, undefined, [SPACE])).toBe(true);
    expect(takesPartInFollow(SPACE, { spaceId: 'space-2', identityKey: LEADER }, ['space-3'])).toBe(false);
  });
});

describe('getPointerAnchor', () => {
  test('places a pointer against its plank, else its navtree row, else the window', ({ expect }) => {
    expect(getPointerAnchor({ plank: 'root/s/doc', row: 'root/s/doc' })).toEqual({ kind: 'plank', id: 'root/s/doc' });
    expect(getPointerAnchor({ row: 'root/s/collections' })).toEqual({ kind: 'row', id: 'root/s/collections' });
    expect(getPointerAnchor({})).toEqual({ kind: 'window' });
  });
});
