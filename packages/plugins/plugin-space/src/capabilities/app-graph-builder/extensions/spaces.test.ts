//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import type * as Node from '@dxos/app-graph/Node';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { type Space, SpaceState } from '@dxos/client/echo';

import { constructPendingSpaceNode, isPendingSpace } from './spaces';

describe('isPendingSpace', () => {
  test('a space on its way to ready is pending', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_INITIALIZING)).toBe(true);
    expect(isPendingSpace(SpaceState.SPACE_ACTIVE)).toBe(true);
    // The proxy's initial state, which opens on its own.
    expect(isPendingSpace(SpaceState.SPACE_CLOSED)).toBe(true);
  });

  test('a ready space is not pending, since it has a node of its own', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_READY)).toBe(false);
  });

  test('states a space rests in are not pending', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_INACTIVE)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_ERROR)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_REQUIRES_MIGRATION)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_CONTROL_ONLY)).toBe(false);
    expect(isPendingSpace(SpaceState.SPACE_DELETED)).toBe(false);
    expect(isPendingSpace(SpaceState.INVALID)).toBe(false);
    expect(isPendingSpace(undefined)).toBe(false);
  });

  test('a closed space is not pending under lazySpaceOpen, where nothing would open it', ({ expect }) => {
    expect(isPendingSpace(SpaceState.SPACE_CLOSED, true)).toBe(false);
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
  const makePendingNode = (namesCache?: Record<string, string>): Node.Node => {
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
