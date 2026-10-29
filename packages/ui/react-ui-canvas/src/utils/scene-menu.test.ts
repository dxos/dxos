//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SceneMenuState, sceneMenuItems } from './scene-menu.ts';

const state: SceneMenuState = {
  kind: 'element',
  readonly: false,
  canUndo: true,
  canRedo: false,
  canPaste: true,
  canCreate: true,
  canDelete: true,
  canGroup: true,
  canUngroup: false,
  canMakeObject: true,
};

describe('sceneMenuItems', () => {
  test('one list of commands for both dimensions, with their shortcuts and states', ({ expect }) => {
    const items = sceneMenuItems(state);
    expect(items.map((item) => item.id)).toEqual([
      'undo',
      'redo',
      'cut',
      'copy',
      'paste',
      'duplicate',
      'delete',
      'group',
      'ungroup',
      'make-object',
    ]);
    expect(items.find((item) => item.id === 'redo')?.disabled).toBe(true);
    expect(items.find((item) => item.id === 'copy')?.shortcut).toBeTruthy();
  });

  test('locked: only Copy stays enabled', ({ expect }) => {
    const items = sceneMenuItems({ ...state, readonly: true });
    expect(items.filter((item) => !item.disabled).map((item) => item.id)).toEqual(['copy']);
  });

  test('on empty space the selection commands are left out', ({ expect }) => {
    const ids = sceneMenuItems({ ...state, kind: 'canvas' }).map((item) => item.id);
    expect(ids).toEqual(['undo', 'redo', 'paste']);
  });
});
