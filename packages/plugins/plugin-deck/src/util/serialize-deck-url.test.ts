//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type PathResolution } from '@dxos/app-graph';

import { serializeDeckToUrl } from './serialize-deck-url';

const WORKSPACE_A = 'workspaceA';
const WORKSPACE_B = 'workspaceB';

const rep = (key: string, id: string, workspace = WORKSPACE_A): PathResolution.RepresentedNode => ({
  key,
  id,
  workspace,
});

describe('serializeDeckToUrl', () => {
  test('serializes an empty deck to a workspace-only path', ({ expect }) => {
    const path = serializeDeckToUrl({
      workspace: WORKSPACE_A,
      workspaceKey: 'w',
      active: [],
      representations: new Map(),
    });
    expect(path).toBe(`/w/${WORKSPACE_A}`);
  });

  test('serializes a single plank', ({ expect }) => {
    const path = serializeDeckToUrl({
      workspace: WORKSPACE_A,
      workspaceKey: 'w',
      active: ['docA'],
      representations: new Map([['docA', rep('doc', 'A')]]),
    });
    expect(path).toBe(`/w/${WORKSPACE_A}/doc/A`);
  });

  test('serializes a multi-plank deck in order', ({ expect }) => {
    const path = serializeDeckToUrl({
      workspace: WORKSPACE_A,
      workspaceKey: 'w',
      active: ['docA', 'sheetB'],
      representations: new Map([
        ['docA', rep('doc', 'A')],
        ['sheetB', rep('sheet', 'B')],
      ]),
    });
    expect(path).toBe(`/w/${WORKSPACE_A}/doc/A/sheet/B`);
  });

  test('emits a mid-chain anchor pair when a plank is from another workspace', ({ expect }) => {
    const path = serializeDeckToUrl({
      workspace: WORKSPACE_A,
      workspaceKey: 'w',
      active: ['docA', 'taskB'],
      representations: new Map([
        ['docA', rep('doc', 'A')],
        ['taskB', rep('task', 'B', WORKSPACE_B)],
      ]),
    });
    expect(path).toBe(`/w/${WORKSPACE_A}/doc/A/w/${WORKSPACE_B}/task/B`);
  });

  test('appends the attended plank companion pair', ({ expect }) => {
    const path = serializeDeckToUrl({
      workspace: WORKSPACE_A,
      workspaceKey: 'w',
      active: ['docA', 'sheetB'],
      representations: new Map([
        ['docA', rep('doc', 'A')],
        ['sheetB', rep('sheet', 'B')],
      ]),
      companion: { attendedId: 'docA', node: { key: 'comments', workspace: WORKSPACE_A } },
    });
    expect(path).toBe(`/w/${WORKSPACE_A}/doc/A/comments/sheet/B`);
  });

  test('skips a plank with no representation and warns', ({ expect }) => {
    const path = serializeDeckToUrl({
      workspace: WORKSPACE_A,
      workspaceKey: 'w',
      active: ['docA', 'not-found'],
      representations: new Map([['docA', rep('doc', 'A')]]),
    });
    expect(path).toBe(`/w/${WORKSPACE_A}/doc/A`);
  });
});
