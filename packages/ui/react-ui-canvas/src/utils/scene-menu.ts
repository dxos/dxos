//
// Copyright 2026 DXOS.org
//

import { KEY_BINDINGS, type KeyAction, matchesBinding, shortcutLabel } from '../model/index.ts';

/** The commands a scene's right-click menu offers, in both dimensions. */
export type SceneMenuCommand =
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'delete'
  | 'group'
  | 'ungroup'
  | 'make-object';

/** What the menu reads: where it opened (an element, or empty space) and the state each command already has. */
export type SceneMenuState = {
  kind: 'element' | 'canvas';
  /** Locked: everything but Copy is disabled. */
  readonly: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canPaste: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canMakeObject: boolean;
};

export type SceneMenuItem = {
  id: SceneMenuCommand;
  label: string;
  /** The chord the keyboard takes for it, as labels print it. */
  shortcut?: string;
  disabled: boolean;
  /** A separator goes before it. */
  separated?: boolean;
};

export const SCENE_MENU_LABELS: Record<SceneMenuCommand, string> = {
  'undo': 'Undo',
  'redo': 'Redo',
  'cut': 'Cut',
  'copy': 'Copy',
  'paste': 'Paste',
  'duplicate': 'Duplicate',
  'delete': 'Delete',
  'group': 'Group',
  'ungroup': 'Ungroup',
  'make-object': 'Make object',
};

export const SCENE_MENU_KEYS: Partial<Record<SceneMenuCommand, KeyAction>> = {
  undo: 'undo',
  redo: 'redo',
  cut: 'cut',
  copy: 'copy',
  paste: 'paste',
  duplicate: 'duplicate',
  delete: 'delete',
  group: 'group',
  ungroup: 'ungroup',
};

/**
 * The right-click menu's items, built once for both dimensions from the same command state the shortcuts and the
 * actions bar read: undo and redo, then the clipboard, then (on an element) the selection's commands.
 */
export const sceneMenuItems = (state: SceneMenuState): SceneMenuItem[] => {
  const edits = !state.readonly;
  const element = state.kind === 'element';
  const enabled: Record<SceneMenuCommand, boolean> = {
    'undo': edits && state.canUndo,
    'redo': edits && state.canRedo,
    'cut': edits && state.canDelete,
    'copy': true,
    'paste': edits && state.canPaste && state.canCreate,
    'duplicate': edits && state.canCreate,
    'delete': edits && state.canDelete,
    'group': edits && state.canGroup,
    'ungroup': edits && state.canUngroup,
    'make-object': edits && state.canMakeObject,
  };
  const ids: SceneMenuCommand[] = element
    ? ['undo', 'redo', 'cut', 'copy', 'paste', 'duplicate', 'delete', 'group', 'ungroup', 'make-object']
    : ['undo', 'redo', 'paste'];
  const separated = new Set<SceneMenuCommand>(['cut', 'group', ...(element ? [] : ['paste' as const])]);
  return ids.map((id) => {
    const key = SCENE_MENU_KEYS[id];
    const binding = key === undefined ? undefined : KEY_BINDINGS[key][0];
    return {
      id,
      label: SCENE_MENU_LABELS[id],
      ...(binding ? { shortcut: shortcutLabel(binding) } : {}),
      disabled: !enabled[id],
      ...(separated.has(id) ? { separated: true } : {}),
    };
  });
};
