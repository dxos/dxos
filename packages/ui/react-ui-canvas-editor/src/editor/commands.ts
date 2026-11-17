//
// Copyright 2026 DXOS.org
//

import {
  KEY_BINDINGS,
  type KeyEventLike,
  SCENE_MENU_KEYS,
  SCENE_MENU_LABELS,
  type SceneMenuCommand,
  type SceneMenuItem,
  type SceneMenuState,
  matchesBinding,
  sceneMenuItems,
  shortcutLabel,
} from '@dxos/react-ui-canvas';

/** One command as every surface shows and runs it: the actions bar, the context menu, the shortcuts and the app. */
export type Command = {
  id: string;
  label: string;
  icon: string;
  /** The chord the keyboard takes for it, as labels print it. */
  shortcut?: string;
  enabled: boolean;
  /** A toggle's state; unset, the command is a plain action. */
  pressed?: boolean;
  run: () => void;
};

/** A shared command as the dimension's engine runs it, its state already read. */
export type EngineCommand = Pick<Command, 'enabled' | 'run'>;

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
  /** The scene draws in a stored order a restack can change, which is 2D's: a 3D scene draws by depth. */
  canOrder: boolean;
  /** False when the host gives no codec, so the view keeps its own clipboard. */
  clipboard?: boolean;
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
  'bring-to-front': 'ph--arrow-line-up--regular',
  'send-to-back': 'ph--arrow-line-down--regular',
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
  'delete',
  'group',
  'ungroup',
  'make-object',
  'bring-to-front',
  'send-to-back',
  'undo',
  'redo',
];

/**
 * The actions bar's groups, each in the order it shows: editing the selection, putting it together, and combining
 * solids. A dimension's command named here sits with the shared ones; any other follows, ahead of undo and redo.
 */
export const ACTION_GROUPS: readonly (readonly string[])[] = [
  ['cut', 'copy', 'paste', 'duplicate', 'delete'],
  ['group', 'ungroup', 'hull', 'make-object'],
  ['join', 'subtract'],
];

/** The shared commands the right-click menu offers and the actions bar leaves out, as the inspector restacks too. */
export const MENU_ONLY_COMMANDS: ReadonlySet<string> = new Set<SceneMenuCommand>(['bring-to-front', 'send-to-back']);

/**
 * The editor's command table, the same shared commands in 2D and 3D with the dimension's own and the config's extras
 * after them; a shared command the dimension's engine runs (`edits`) takes the engine's state. Locked, only Copy stays
 * enabled.
 */
export const buildCommands = ({
  state,
  run,
  edits = {},
  dimension = [],
  extras = [],
}: {
  state: CommandState;
  run: Readonly<Record<SceneMenuCommand, () => void>>;
  edits?: Partial<Record<SceneMenuCommand, EngineCommand>>;
  dimension?: readonly Command[];
  extras?: readonly ExtraCommand[];
}): CommandTable => {
  const editable = !state.readonly;
  const some = editable && state.selection.length > 0;
  const clipboard = state.clipboard !== false;
  const enabled: Record<SceneMenuCommand, boolean> = {
    'undo': editable && state.canUndo,
    'redo': editable && state.canRedo,
    'cut': clipboard && some,
    'copy': clipboard && state.selection.length > 0,
    'paste': clipboard && editable,
    'duplicate': clipboard && some,
    'delete': some,
    'bring-to-front': some && state.canOrder,
    'send-to-back': some && state.canOrder,
    'group': editable && state.selection.length > 1,
    'ungroup': editable && state.canUngroup,
    'make-object': some && state.canMakeObject,
  };
  const commands: Command[] = [
    ...SHARED_COMMANDS.map((id): Command => {
      const key = SCENE_MENU_KEYS[id];
      const binding = key === undefined ? undefined : KEY_BINDINGS[key][0];
      const edit = edits[id];
      return {
        id,
        label: SCENE_MENU_LABELS[id],
        icon: ICONS[id],
        ...(binding ? { shortcut: shortcutLabel(binding) } : {}),
        enabled: edit ? (editable || id === 'copy') && edit.enabled : enabled[id],
        run: edit?.run ?? run[id],
      };
    }),
    ...dimension.map((command): Command => ({ ...command, enabled: editable && command.enabled })),
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
        const key = SCENE_MENU_KEYS[id];
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
  canOrder: true,
  canGroup: true,
  canUngroup: true,
  canMakeObject: true,
};
