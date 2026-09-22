//
// Copyright 2026 DXOS.org
//

//
// The editor's keyboard bindings in one table, so the view matches events against it and the toolbar
// and palette print the same shortcuts it honours. Tool keys (R, E, L, ...) live on the registry entries
// and are matched by the palette; everything else is here.
//

/** One chord: `key` as `KeyboardEvent.key` (letters lower-case), with the modifiers it needs. */
export type KeyBinding = {
  key: string;
  /** The platform command key: Meta on macOS, Control elsewhere; either satisfies it. */
  meta?: boolean;
  /** Required when set; ignored when absent, so a chord may be held with or without Shift. */
  shift?: boolean;
  alt?: boolean;
};

export type KeyAction =
  | 'cancel'
  | 'delete'
  | 'open'
  | 'fit'
  | 'fitSelection'
  | 'zoomReset'
  | 'back'
  | 'forward'
  | 'nudge'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'selectAll'
  | 'snap'
  | 'debug';

/** Every action's chords; the first is the one shown in labels. */
export const KEY_BINDINGS: Record<KeyAction, KeyBinding[]> = {
  cancel: [{ key: 'Escape' }],
  delete: [{ key: 'Delete' }, { key: 'Backspace' }],
  open: [{ key: 'Enter' }],
  fit: [{ key: 'Home' }, { key: '!', shift: true }],
  fitSelection: [{ key: '@', shift: true }],
  zoomReset: [{ key: ')', shift: true }],
  back: [{ key: 'ArrowLeft', alt: true }],
  forward: [{ key: 'ArrowRight', alt: true }],
  nudge: [{ key: 'ArrowUp' }, { key: 'ArrowDown' }, { key: 'ArrowLeft' }, { key: 'ArrowRight' }],
  copy: [{ key: 'c', meta: true }],
  cut: [{ key: 'x', meta: true }],
  paste: [{ key: 'v', meta: true }],
  undo: [{ key: 'z', meta: true, shift: false }],
  redo: [{ key: 'z', meta: true, shift: true }],
  selectAll: [{ key: 'a', meta: true }],
  snap: [{ key: 'g' }],
  debug: [{ key: 'd' }],
};

/** The subset of a keyboard event the bindings read, so tests and non-React callers can pass a literal. */
export type KeyEventLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

/** The command modifier, held: the same test on a pointer event reveals a node's ports for linking. */
export const hasCommandKey = (event: { metaKey: boolean; ctrlKey: boolean }): boolean => event.metaKey || event.ctrlKey;

export const matchesBinding = (event: KeyEventLike, binding: KeyBinding): boolean => {
  const key =
    binding.key.length === 1 ? event.key.toLowerCase() === binding.key.toLowerCase() : event.key === binding.key;
  return (
    key &&
    hasCommandKey(event) === (binding.meta ?? false) &&
    event.altKey === (binding.alt ?? false) &&
    (binding.shift === undefined || event.shiftKey === binding.shift)
  );
};

/** The action an event asks for, if any; a plain letter that binds no action is left to the tool palette. */
export const keyAction = (event: KeyEventLike): KeyAction | undefined => {
  for (const [action, bindings] of Object.entries(KEY_BINDINGS)) {
    if (bindings.some((binding) => matchesBinding(event, binding))) {
      return action as KeyAction;
    }
  }
  return undefined;
};

/** A key that reaches the tool palette: no command or option modifier, so typing a tool letter is unambiguous. */
export const isToolKey = (event: KeyEventLike): boolean => !hasCommandKey(event) && !event.altKey;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const KEY_GLYPHS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Backspace: '⌫',
  Delete: '⌦',
  Enter: '↩',
  Home: 'Home',
};

/** The chord as a label reads it: modifiers in the platform's order, then the key. */
export const shortcutLabel = (binding: KeyBinding): string => {
  const key = KEY_GLYPHS[binding.key] ?? binding.key.toUpperCase();
  const modifiers = [
    binding.alt ? (IS_MAC ? '⌥' : 'Alt+') : '',
    binding.shift ? (IS_MAC ? '⇧' : 'Shift+') : '',
    binding.meta ? (IS_MAC ? '⌘' : 'Ctrl+') : '',
  ].join('');
  return `${modifiers}${key}`;
};

/** The label for an action's first chord. */
export const shortcutFor = (action: KeyAction): string => shortcutLabel(KEY_BINDINGS[action][0]);
