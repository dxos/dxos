//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type KeyEventLike } from '../model/index.ts';
import { type SceneMenuCommand, type SceneMenuState, sceneMenuItems } from '../utils/index.ts';
import { type CommandState, type CommandTable, type ExtraCommand, SHARED_COMMANDS, buildCommands } from './commands.ts';

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
    const table = buildCommands({ state: { ...STATE, canRedo: false }, run: RUN });
    const items = table.menuItems('element');
    expect(items.find((item) => item.id === 'redo')?.disabled).toBe(true);
    expect(items.find((item) => item.id === 'ungroup')?.disabled).toBe(true);
    expect(items.find((item) => item.id === 'make-object')?.disabled).toBe(false);
  });
});

const STATE: CommandState = {
  readonly: false,
  selection: ['a', 'b'],
  canUndo: true,
  canRedo: true,
  canUngroup: false,
  canMakeObject: true,
};

const handlers = (onRun: (id: SceneMenuCommand) => void): Record<SceneMenuCommand, () => void> => ({
  'undo': () => onRun('undo'),
  'redo': () => onRun('redo'),
  'cut': () => onRun('cut'),
  'copy': () => onRun('copy'),
  'paste': () => onRun('paste'),
  'duplicate': () => onRun('duplicate'),
  'delete': () => onRun('delete'),
  'group': () => onRun('group'),
  'ungroup': () => onRun('ungroup'),
  'make-object': () => onRun('make-object'),
});

const RUN = handlers(() => {});

describe('buildCommands', () => {
  test('2D and 3D configs yield the same shared commands for the same state', ({ expect }) => {
    const join: ExtraCommand = {
      id: 'join',
      label: 'Join',
      icon: 'ph--unite--regular',
      enabled: () => true,
      run: () => {},
    };
    const align: ExtraCommand = {
      id: 'align',
      label: 'Align',
      icon: 'ph--align-left--regular',
      enabled: () => true,
      run: () => {},
    };
    const shared = (table: CommandTable) =>
      table.commands
        .filter((command) => SHARED_COMMANDS.some((id) => id === command.id))
        .map(({ run: _run, ...command }) => command);
    const table3d = buildCommands({ state: STATE, run: RUN, extras: [join] });
    const table2d = buildCommands({ state: STATE, run: RUN, extras: [align] });
    expect(shared(table3d)).toEqual(shared(table2d));
    expect(table3d.get('join')?.enabled).toBe(true);
    expect(table2d.get('join')).toBeUndefined();
  });

  test('locked leaves only copy enabled', ({ expect }) => {
    const join: ExtraCommand = {
      id: 'join',
      label: 'Join',
      icon: 'ph--unite--regular',
      enabled: () => true,
      run: () => {},
    };
    const table = buildCommands({ state: { ...STATE, readonly: true }, run: RUN, extras: [join] });
    expect(table.commands.filter((command) => command.enabled).map((command) => command.id)).toEqual(['copy']);
  });

  test('the keymap is derived from the table', ({ expect }) => {
    const ran: string[] = [];
    const run = handlers((id) => ran.push(id));
    const table = buildCommands({ state: STATE, run });
    const key = (key: string, modifiers: Partial<KeyEventLike> = {}): KeyEventLike => ({
      key,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      ...modifiers,
    });
    table.keyCommand(key('c', { metaKey: true }))?.run();
    table.keyCommand(key('z', { metaKey: true, shiftKey: true }))?.run();
    table.keyCommand(key('Delete'))?.run();
    expect(ran).toEqual(['copy', 'redo', 'delete']);
    // Each command's label shows the chord its key takes.
    expect(table.get('copy')?.shortcut).toBeTruthy();
    // A disabled command takes no key.
    expect(buildCommands({ state: { ...STATE, selection: [] }, run }).keyCommand(key('Delete'))).toBeUndefined();
  });
});
