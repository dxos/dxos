//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test, vi } from 'vitest';

import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { SpaceState } from '@dxos/client/echo';

import {
  constructPendingSpaceNode,
  isOrderResolved,
  isPendingSpace,
  isPendingSpaceNode,
  shouldListSpace,
} from './spaces.ts';

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

describe('isOrderResolved', () => {
  test('waits while the settings space opens, until its deadline', ({ expect }) => {
    const waiting = { found: false, settingsSpaceState: SpaceState.SPACE_INITIALIZING };
    expect(isOrderResolved({ ...waiting, timedOut: never })).toBe(false);
    expect(isOrderResolved({ ...waiting, timedOut: elapsed })).toBe(true);
  });

  test('does not wait once found, or on a settings space that is unlisted or resting', ({ expect }) => {
    const timedOut = vi.fn(never);
    expect(isOrderResolved({ found: true, settingsSpaceState: SpaceState.SPACE_READY, timedOut })).toBe(true);
    expect(isOrderResolved({ found: false, settingsSpaceState: undefined, timedOut })).toBe(true);
    expect(isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_ERROR, timedOut })).toBe(true);
    expect(
      isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_CLOSED, lazySpaceOpen: true, timedOut }),
    ).toBe(true);
    expect(timedOut).not.toHaveBeenCalled();
  });
});

describe('isPendingSpaceNode', () => {
  test('a space renders as itself only once it is ready and the ordering has resolved', ({ expect }) => {
    expect(isPendingSpaceNode({ state: SpaceState.SPACE_READY, orderResolved: true })).toBe(false);
    expect(isPendingSpaceNode({ state: SpaceState.SPACE_READY, orderResolved: false })).toBe(true);
    expect(isPendingSpaceNode({ state: SpaceState.SPACE_INITIALIZING, orderResolved: true })).toBe(true);
  });
});

describe('constructPendingSpaceNode', () => {
  test('is a pending workspace that space-scoped connectors cannot match', ({ expect }) => {
    const { id, type, data, properties } = constructPendingSpaceNode({ id: 'space-1' });
    expect(properties?.pending).toBe(true);
    expect(Option.isNone(AppNodeMatcher.whenSpace({ id, type, data, properties: properties ?? {} }))).toBe(true);
  });
});
