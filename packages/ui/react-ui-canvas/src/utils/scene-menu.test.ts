//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SceneCommands, type SceneMenuState, commandMenuItems, sceneMenuItems } from './scene-menu.ts';

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

  test('a command table gives the menu its states, so the bar, shortcuts and menu share one source', ({ expect }) => {
    const ran: string[] = [];
    const command = (id: string, enabled: boolean) => ({ run: () => ran.push(id), enabled: () => enabled });
    const commands: SceneCommands = {
      'undo': command('undo', true),
      'redo': command('redo', false),
      'cut': command('cut', true),
      'copy': command('copy', true),
      'paste': command('paste', true),
      'duplicate': command('duplicate', true),
      'delete': command('delete', true),
      'group': command('group', false),
      'make-object': command('make-object', true),
    };
    const items = commandMenuItems('element', false, commands);
    expect(items.find((item) => item.id === 'redo')?.disabled).toBe(true);
    expect(items.find((item) => item.id === 'group')?.disabled).toBe(true);
    // A command the table leaves out is offered disabled, never run.
    expect(items.find((item) => item.id === 'ungroup')?.disabled).toBe(true);
    expect(items.find((item) => item.id === 'make-object')?.disabled).toBe(false);
    // Locked, only Copy stays enabled, whatever the table says.
    expect(
      commandMenuItems('element', true, commands)
        .filter((item) => !item.disabled)
        .map((item) => item.id),
    ).toEqual(['copy']);
  });
});
