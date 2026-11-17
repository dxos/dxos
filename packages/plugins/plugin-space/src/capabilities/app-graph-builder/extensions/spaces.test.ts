//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test, vi } from 'vitest';

import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { SpaceState } from '@dxos/client/echo';

import { constructPendingSpaceNode, isPendingSpace, isPendingSpaceNode, shouldListSpace } from './spaces.ts';

const never = () => false;
const elapsed = () => true;

describe('isPendingSpace', () => {
  test('only the states SpaceList opens a space through are pending', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_CLOSED)).toBe(true);
    expect(isPendingSpace(SpaceState.SPACE_CONTROL_ONLY)).toBe(true);
    expect(isPendingSpace(SpaceState.SPACE_INITIALIZING)).toBe(true);
    expect(isPendingSpace(SpaceState.SPACE_READY)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_ERROR)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_INACTIVE)).toBe(false);
  });

  test('under lazySpaceOpen a closed space is resting, not pending', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_CLOSED, true)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_CONTROL_ONLY, true)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_INITIALIZING, true)).toBe(true);
  });
});

describe('shouldListSpace', () => {
  test('a ready space is listed without starting a deadline', ({ expect }) => {
    const timedOut = vi.fn(elapsed);
    expect(shouldListSpace({ state: SpaceState.SPACE_READY, timedOut })).toBe(true);
    expect(timedOut).not.toHaveBeenCalled();
  });

  test('a pending space is listed until its deadline', ({ expect }) => {
    expect(shouldListSpace({ state: SpaceState.SPACE_INITIALIZING, timedOut: never })).toBe(true);
    expect(shouldListSpace({ state: SpaceState.SPACE_INITIALIZING, timedOut: elapsed })).toBe(false);
  });
});

describe('isPendingSpaceNode', () => {
  test('a space renders as itself once it is ready, whether or not the navtree order has arrived', ({ expect }) => {
    expect(isPendingSpaceNode(SpaceState.SPACE_READY)).toBe(false);
    expect(isPendingSpaceNode(SpaceState.SPACE_INITIALIZING)).toBe(true);
    expect(isPendingSpaceNode(undefined)).toBe(true);
  });
});

describe('constructPendingSpaceNode', () => {
  test('is a pending workspace that space-scoped connectors cannot match', ({ expect }) => {
    const { id, type, data, properties } = constructPendingSpaceNode({ id: 'space-1' });
    expect(properties?.pending).toBe(true);
    expect(Option.isNone(AppNodeMatcher.whenSpace({ id, type, data, properties: properties ?? {} }))).toBe(true);
  });
});
