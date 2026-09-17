//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test, vi } from 'vitest';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Entity, Obj } from '@dxos/echo';

import { constructSpaceNode, isOrderResolved, isPendingSpace, isSpacePlaceholder, shouldListSpace } from './spaces.ts';

describe('isPendingSpace', () => {
  test('a space on its way to ready is pending', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_CLOSED)).toBe(true);
    expect(isPendingSpace(SpaceState.SPACE_CONTROL_ONLY)).toBe(true);
    expect(isPendingSpace(SpaceState.SPACE_INITIALIZING)).toBe(true);
  });

  test('a ready space is not pending, since it has a node of its own', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_READY)).toBe(false);
  });

  test('states a space rests in are not pending', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_INACTIVE)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_ERROR)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_REQUIRES_MIGRATION)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_DELETED)).toBe(false);
    expect(isPendingSpace(SpaceState.INVALID)).toBe(false);
    expect(isPendingSpace(undefined)).toBe(false);
  });

  test('a closed space is not pending under lazySpaceOpen, where nothing would open it', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_CLOSED, true)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_CONTROL_ONLY, true)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_INITIALIZING, true)).toBe(true);
  });
});

describe('placeholder space node', () => {
  const SPACE_ID = 'BFEDCBA9876543210FEDCBA9876543210';

  const makeFakeSpace = (): Space => ({ id: SPACE_ID }) as unknown as Space;

  const makePendingNode = (namesCache?: Record<string, string>): AppGraphNode.Node => {
    const { id, type, data, properties } = constructSpaceNode({
      space: makeFakeSpace(),
      placeholder: true,
      namesCache,
    });
    return { id, type, data, properties: properties ?? {} };
  };

  test('is a disabled, pending workspace keyed by the space it stands for', ({ expect }) => {
    const node = makePendingNode();

    expect(node.id).toBe(SPACE_ID);
    expect(node.properties.pending).toBe(true);
    expect(node.properties.disabled).toBe(true);
    expect(node.properties.disposition).toBe('workspace');
  });

  test('child connectors cannot match it', ({ expect }) => {
    expect(Option.isNone(AppNodeMatcher.whenSpace(makePendingNode()))).toBe(true);
  });

  test('takes its label from the cache, so a returning user sees real names while spaces open', ({ expect }) => {
    expect(makePendingNode({ [SPACE_ID]: 'Reading list' }).properties.label).toBe('Reading list');
  });

  test('says it is loading when the space has never been seen before', ({ expect }) => {
    expect(makePendingNode().properties.label).toEqual(['loading-space.label', { ns: 'org.dxos.plugin.space' }]);
  });
});

describe('pending and ready space nodes', () => {
  const SPACE_ID = 'BFEDCBA9876543210FEDCBA9876543210';

  const makeFakeProperties = (): Record<string | symbol, unknown> => ({
    [Entity.KindId]: Entity.Kind.Object,
    [Obj.Meta]: { keys: [], annotations: {} },
    hue: 'amber',
    icon: 'planet',
    iconHue: 'amber',
  });

  const makeReadySpace = (): Space =>
    ({
      id: SPACE_ID,
      state: { get: () => SpaceState.SPACE_READY },
      properties: makeFakeProperties(),
    }) as unknown as Space;

  test('an opened space is no longer pending', ({ expect }) => {
    const node = constructSpaceNode({ space: makeReadySpace(), navigable: true });

    expect(node.properties?.pending).toBe(false);
    expect(node.properties?.hue).toBe('amber');
  });

  test('a pending space publishes no appearance of its own', ({ expect }) => {
    const properties: Record<string, unknown> =
      constructSpaceNode({ space: makeReadySpace(), placeholder: true }).properties ?? {};

    expect(properties.hue).toBeUndefined();
    expect(properties.icon).toBeUndefined();
    expect(properties.iconHue).toBeUndefined();
    expect(properties.onRearrange).toBeUndefined();
    expect(properties.canDrop).toBeUndefined();
  });
});

describe('isSpacePlaceholder', () => {
  test('an opened space renders as itself once the ordering has resolved', ({ expect }) => {
    expect(isSpacePlaceholder({ state: SpaceState.SPACE_READY, orderResolved: true })).toBe(false);
  });

  test('every space waits for the ordering, however ready it is', ({ expect }) => {
    expect(isSpacePlaceholder({ state: SpaceState.SPACE_READY, orderResolved: false })).toBe(true);
  });

  test('a space that has not opened is a placeholder either way', ({ expect }) => {
    expect(isSpacePlaceholder({ state: SpaceState.SPACE_INITIALIZING, orderResolved: true })).toBe(true);
    expect(isSpacePlaceholder({ state: SpaceState.SPACE_CLOSED, orderResolved: false })).toBe(true);
    expect(isSpacePlaceholder({ state: undefined, orderResolved: true })).toBe(true);
  });
});

describe('shouldListSpace', () => {
  const never = () => false;
  const elapsed = () => true;

  test('an opened space is listed without consulting its deadline', ({ expect }) => {
    const timedOut = vi.fn(elapsed);
    expect(shouldListSpace({ state: SpaceState.SPACE_READY, timedOut })).toBe(true);
    expect(timedOut).not.toHaveBeenCalled();
  });

  test('a space still opening is listed', ({ expect }) => {
    expect(shouldListSpace({ state: SpaceState.SPACE_INITIALIZING, timedOut: never })).toBe(true);
    expect(shouldListSpace({ state: SpaceState.SPACE_CONTROL_ONLY, timedOut: never })).toBe(true);
  });

  test('a space that never opened is dropped once it times out', ({ expect }) => {
    expect(shouldListSpace({ state: SpaceState.SPACE_INITIALIZING, timedOut: elapsed })).toBe(false);
    expect(shouldListSpace({ state: SpaceState.SPACE_CLOSED, timedOut: elapsed })).toBe(false);
  });

  test('states a space rests in are never listed, and hold no deadline', ({ expect }) => {
    const timedOut = vi.fn(never);
    expect(shouldListSpace({ state: SpaceState.SPACE_INACTIVE, timedOut })).toBe(false);
    expect(shouldListSpace({ state: SpaceState.SPACE_ERROR, timedOut })).toBe(false);
    expect(shouldListSpace({ state: SpaceState.SPACE_CLOSED, timedOut, lazySpaceOpen: true })).toBe(false);
    expect(timedOut).not.toHaveBeenCalled();
  });
});

describe('isOrderResolved', () => {
  const never = () => false;

  test('resolves once the ordering is found, without consulting the deadline', ({ expect }) => {
    const timedOut = vi.fn(never);
    expect(isOrderResolved({ found: true, settingsSpaceState: SpaceState.SPACE_READY, timedOut })).toBe(true);
    expect(timedOut).not.toHaveBeenCalled();
  });

  test('waits while the settings space is opening or open with the query outstanding', ({ expect }) => {
    expect(isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_CLOSED, timedOut: never })).toBe(false);
    expect(isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_READY, timedOut: never })).toBe(false);
  });

  test('stops waiting once the settings space exceeds its deadline', ({ expect }) => {
    expect(
      isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_INITIALIZING, timedOut: () => true }),
    ).toBe(true);
  });

  test('does not wait on a settings space that is unlisted or resting short of ready', ({ expect }) => {
    expect(isOrderResolved({ found: false, settingsSpaceState: undefined, timedOut: never })).toBe(true);
    expect(isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_ERROR, timedOut: never })).toBe(true);
    expect(
      isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_REQUIRES_MIGRATION, timedOut: never }),
    ).toBe(true);
    expect(
      isOrderResolved({
        found: false,
        settingsSpaceState: SpaceState.SPACE_CLOSED,
        lazySpaceOpen: true,
        timedOut: never,
      }),
    ).toBe(true);
  });
});
