//
// Copyright 2026 DXOS.org
//

import { KEY_BINDINGS, type KeyAction, type KeyEventLike, matchesBinding, shortcutLabel } from '../model/index.ts';

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

const LABELS: Record<SceneMenuCommand, string> = {
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

const KEYS: Partial<Record<SceneMenuCommand, KeyAction>> = {
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
    const key = KEYS[id];
    const binding = key === undefined ? undefined : KEY_BINDINGS[key][0];
    return {
      id,
      label: LABELS[id],
      ...(binding ? { shortcut: shortcutLabel(binding) } : {}),
      disabled: !enabled[id],
      ...(separated.has(id) ? { separated: true } : {}),
    };
  });
};

/** One command as every surface shows and runs it: the actions bar, the context menu, the shortcuts and the app. */
export type Command = {
  id: string;
  label: string;
  icon: string;
  /** The chord the keyboard takes for it, as labels print it. */
  shortcut?: string;
  enabled: boolean;
  run: () => void;
};

/** What the shared commands' states are read from. */
export type CommandState = {
  readonly: boolean;
  selection: readonly string[];
  canUndo: boolean;
  canRedo: boolean;
  /** The one selected element is a group. */
  canUngroup: boolean;
  /** The canvas has a model to extract an object into. */
  canMakeObject: boolean;
};

/** A command only one dimension offers, already bound to its editor. */
export type ExtraCommand = Omit<Command, 'shortcut' | 'enabled'> & {
  enabled: (state: CommandState) => boolean;
};

/** The editor's commands: one table every surface reads. */
export type CommandTable = {
  /** The shared commands, then the dimension's extras. */
  commands: readonly Command[];
  get: (id: string) => Command | undefined;
  /** The context menu's items over an element or empty space, in the table's states. */
  menuItems: (kind: SceneMenuState['kind']) => SceneMenuItem[];
  /** The enabled command a key chord runs, if any; the bindings are the table's own shortcuts. */
  keyCommand: (event: KeyEventLike) => Command | undefined;
};

const ICONS: Record<SceneMenuCommand, string> = {
  'undo': 'ph--arrow-counter-clockwise--regular',
  'redo': 'ph--arrow-clockwise--regular',
  'cut': 'ph--scissors--regular',
  'copy': 'ph--copy--regular',
  'paste': 'ph--clipboard--regular',
  'duplicate': 'ph--copy-simple--regular',
  'delete': 'ph--trash--regular',
  'group': 'ph--selection-plus--regular',
  'ungroup': 'ph--selection-slash--regular',
  'make-object': 'ph--package--regular',
};

/** The shared commands, in the order the actions bar shows them. */
export const SHARED_COMMANDS: readonly SceneMenuCommand[] = [
  'cut',
  'copy',
  'paste',
  'duplicate',
  'group',
  'ungroup',
  'make-object',
  'delete',
  'undo',
  'redo',
];

/**
 * The editor's command table, the same shared commands in 2D and 3D with the dimension's extras after them. Locked,
 * only Copy stays enabled.
 */
export const buildCommands = ({
  state,
  run,
  extras = [],
}: {
  state: CommandState;
  run: Readonly<Record<SceneMenuCommand, () => void>>;
  extras?: readonly ExtraCommand[];
}): CommandTable => {
  const editable = !state.readonly;
  const some = editable && state.selection.length > 0;
  const enabled: Record<SceneMenuCommand, boolean> = {
    'undo': editable && state.canUndo,
    'redo': editable && state.canRedo,
    'cut': some,
    'copy': state.selection.length > 0,
    'paste': editable,
    'duplicate': some,
    'delete': some,
    'group': editable && state.selection.length > 1,
    'ungroup': editable && state.canUngroup,
    'make-object': some && state.canMakeObject,
  };
  const commands: Command[] = [
    ...SHARED_COMMANDS.map((id): Command => {
      const key = KEYS[id];
      const binding = key === undefined ? undefined : KEY_BINDINGS[key][0];
      return {
        id,
        label: LABELS[id],
        icon: ICONS[id],
        ...(binding ? { shortcut: shortcutLabel(binding) } : {}),
        enabled: enabled[id],
        run: run[id],
      };
    }),
    ...extras.map(({ enabled, ...extra }): Command => ({ ...extra, enabled: editable && enabled(state) })),
  ];
  const byId = new Map(commands.map((command) => [command.id, command]));
  return {
    commands,
    get: (id) => byId.get(id),
    menuItems: (kind) =>
      sceneMenuItems({ kind, readonly: state.readonly, ...ALL_ENABLED }).map((item) => ({
        ...item,
        disabled: item.disabled || !(byId.get(item.id)?.enabled ?? false),
      })),
    keyCommand: (event) => {
      const id = SHARED_COMMANDS.find((id) => {
        const key = KEYS[id];
        return key !== undefined && KEY_BINDINGS[key].some((binding) => matchesBinding(event, binding));
      });
      const command = id === undefined ? undefined : byId.get(id);
      return command?.enabled ? command : undefined;
    },
  };
};

/** The menu's own rules alone; the command table supplies each command's state. */
const ALL_ENABLED = {
  canUndo: true,
  canRedo: true,
  canPaste: true,
  canCreate: true,
  canDelete: true,
  canGroup: true,
  canUngroup: true,
  canMakeObject: true,
};
