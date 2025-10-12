//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { type Command, type EditorView, type KeyBinding } from '@codemirror/view';

import { commandState } from './state';

export type Action =
  | {
      type: 'insert';
      text: string;
    }
  | {
      type: 'cancel';
    };

export type ActionHandler = (action: Action) => void;

export const openEffect = StateEffect.define<{ pos: number; fullWidth?: boolean }>();
export const closeEffect = StateEffect.define<null>();

export const openCommand: Command = (view: EditorView) => {
  if (view.state.field(commandState, false)) {
    const selection = view.state.selection.main;
    const line = view.state.doc.lineAt(selection.from);
    if (line.from === selection.from && line.from === line.to) {
      view.dispatch({ effects: openEffect.of({ pos: selection.anchor, fullWidth: true }) });
      return true;
    }
  }

  return false;
};

export const closeCommand: Command = (view: EditorView) => {
  if (view.state.field(commandState, false)) {
    view.dispatch({ effects: closeEffect.of(null) });
    return true;
  }

  return false;
};

export const commandKeyBindings: readonly KeyBinding[] = [
  {
    key: '?',
    run: openCommand,
  },
  {
    key: 'Escape',
    run: closeCommand,
  },
];
