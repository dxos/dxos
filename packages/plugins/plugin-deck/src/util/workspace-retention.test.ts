//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { DeckSchema } from '#types';

import { DEFAULT_LOADED_WORKSPACES, evictableWorkspaces, touchWorkspace } from './workspace-retention';

const space = (name: string) => GraphPath.getSpacePath(name);
const pinned = GraphPath.getPinnedWorkspacePath('dxos:settings');

describe('touchWorkspace', () => {
  test('puts a new workspace at the front', ({ expect }) => {
    expect(touchWorkspace([space('a')], space('b'))).to.deep.eq([space('b'), space('a')]);
  });

  test('moves a revisited workspace back to the front rather than duplicating it', ({ expect }) => {
    expect(touchWorkspace([space('a'), space('b'), space('c')], space('c'))).to.deep.eq([
      space('c'),
      space('a'),
      space('b'),
    ]);
  });
});

describe('evictableWorkspaces', () => {
  test('keeps the limit and names the rest', ({ expect }) => {
    const recent = [space('a'), space('b'), space('c'), space('d')];
    expect(evictableWorkspaces(recent, 2)).to.deep.eq([space('c'), space('d')]);
    expect(evictableWorkspaces(recent, 3)).to.deep.eq([space('d')]);
    expect(evictableWorkspaces(recent, 4)).to.deep.eq([]);
  });

  test('names nothing until more than the limit has been visited', ({ expect }) => {
    expect(evictableWorkspaces([], DEFAULT_LOADED_WORKSPACES)).to.deep.eq([]);
    expect(evictableWorkspaces([space('a')], DEFAULT_LOADED_WORKSPACES)).to.deep.eq([]);
    expect(evictableWorkspaces([space('a'), space('b')], DEFAULT_LOADED_WORKSPACES)).to.deep.eq([]);
  });

  test('never names the workspace being entered or the one being left', ({ expect }) => {
    // Whatever the caller asks for: below two, the workspace at position 1 is still mounted.
    const recent = [space('a'), space('b'), space('c')];
    for (const limit of [-1, 0, 1, 2]) {
      expect(evictableWorkspaces(recent, limit)).to.deep.eq([space('c')]);
    }
  });

  test('exempts pinned workspaces, and they do not consume the limit', ({ expect }) => {
    const recent = [pinned, space('a'), space('b'), space('c')];
    expect(evictableWorkspaces(recent, 2)).to.deep.eq([space('c')]);
  });

  test('exempts the unresolved-workspace sentinel, which is not a graph node id', ({ expect }) => {
    const recent = [DeckSchema.DEFAULT_DECK_ID, space('a'), space('b'), space('c')];
    expect(evictableWorkspaces(recent, 2)).to.deep.eq([space('c')]);
  });
});
