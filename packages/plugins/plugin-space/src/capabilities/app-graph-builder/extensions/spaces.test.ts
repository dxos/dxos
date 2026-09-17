//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test, vi } from 'vitest';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Entity, Obj } from '@dxos/echo';

import {
  constructPendingSpaceNode,
  constructSpaceNode,
  isOrderResolved,
  isPendingSpace,
  isSpacePlaceholder,
  shouldListSpace,
} from './spaces.ts';

describe('isPendingSpace', () => {
  test('a space on its way to ready is pending', ({ expect }) => {
    // The states `SpaceList` opens every space through, in order.
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
    // Spaces already opening are unaffected by the setting.
    expect(isPendingSpace(SpaceState.SPACE_INITIALIZING, true)).toBe(true);
  });
});

describe('constructPendingSpaceNode', () => {
  const SPACE_ID = 'BFEDCBA9876543210FEDCBA9876543210';

  /**
   * Carries only the id the pending node reads — deliberately nothing else, since anything a
   * pending node touched on an unopened space would throw in the app.
   */
  const makeFakeSpace = (): Space => ({ id: SPACE_ID }) as unknown as Space;

  /** The graph fills in a connector's omitted fields; do the same so assertions see a whole node. */
  const makePendingNode = (namesCache?: Record<string, string>): AppGraphNode.Node => {
    const { id, type, data, properties } = constructPendingSpaceNode({ space: makeFakeSpace(), namesCache });
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
    // Every space-scoped extension — in this plugin and in others — funnels through `whenSpace`,
    // which needs `node.data` to be a space. A match here would query a database that has not
    // opened. The positive case needs a real space, so it is left to the integration path.
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

  /**
   * Passes `isEntity` and carries `Obj.Meta`, which the migration check reads through
   * `Annotation.get`; the space's own display properties are left unset.
   */
  const makeFakeProperties = (): Record<string | symbol, unknown> => ({
    [Entity.KindId]: Entity.Kind.Object,
    [Obj.Meta]: { keys: [], annotations: {} },
  });

  const makeReadySpace = (): Space =>
    ({
      id: SPACE_ID,
      state: { get: () => SpaceState.SPACE_READY },
      properties: makeFakeProperties(),
    }) as unknown as Space;

  test('the same keys are emitted either way, so a stale one cannot survive the transition', ({ expect }) => {
    // The graph merges node properties rather than replacing them, so a key one generation sets and
    // the next omits can never be cleared: a space that opened would stay `pending` forever.
    const pending = Object.keys(constructPendingSpaceNode({ space: makeReadySpace() }).properties ?? {});
    const ready = Object.keys(constructSpaceNode({ space: makeReadySpace(), navigable: true }).properties ?? {});

    expect(pending.filter((key) => key !== 'testId').toSorted()).toEqual(
      ready.filter((key) => key !== 'testId').toSorted(),
    );
  });

  test('an opened space is no longer pending', ({ expect }) => {
    const node = constructSpaceNode({ space: makeReadySpace(), navigable: true });

    expect(node.properties?.pending).toBe(false);
  });

  test('a pending space publishes no appearance of its own', ({ expect }) => {
    const properties: Record<string, unknown> = constructPendingSpaceNode({ space: makeReadySpace() }).properties ?? {};

    expect(properties.hue).toBeUndefined();
    expect(properties.icon).toBeUndefined();
    expect(properties.iconHue).toBeUndefined();
    // Reordering writes through the space's own database, and dropping onto it would need one.
    expect(properties.onRearrange).toBeUndefined();
    expect(properties.canDrop).toBeUndefined();
  });
});

describe('isSpacePlaceholder', () => {
  test('an opened space renders as itself once the ordering has resolved', ({ expect }) => {
    expect(isSpacePlaceholder({ state: SpaceState.SPACE_READY, orderResolved: true })).toBe(false);
  });

  test('every space waits for the ordering, however ready it is', ({ expect }) => {
    // Rendering before the ordering lands puts spaces in arrival order and re-sorts them under the
    // user once it arrives, so they wait together rather than jumping.
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
    // Every space is held as a placeholder until the ordering resolves, so an opened space must
    // survive the timeout; otherwise a slow settings space would empty the whole rail.
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
    // A profile that never gets a settings space would otherwise hold open spaces back on every boot.
    expect(isOrderResolved({ found: false, settingsSpaceState: undefined, timedOut: never })).toBe(true);
    // Otherwise every workspace, however ready, would stay a placeholder for good.
    expect(isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_ERROR, timedOut: never })).toBe(true);
    expect(
      isOrderResolved({ found: false, settingsSpaceState: SpaceState.SPACE_REQUIRES_MIGRATION, timedOut: never }),
    ).toBe(true);
    // Nothing opens the settings space under lazySpaceOpen.
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
