//
// Copyright 2024 DXOS.org
//

import { type Extension, Facet } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { vim } from '@replit/codemirror-vim';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';

export const focusEvent = 'focus.container';

export type EditorMode = 'default' | 'vim' | 'vscode' | undefined;

export type EditorConfig = {
  type: string;
  noTabster?: boolean;
};

export const editorMode = Facet.define<EditorConfig, EditorConfig>({
  combine: (modes) => modes[0] ?? {},
});

export const EditorModes: { [mode: string]: Extension } = {
  default: [],
  vscode: [
    // https://github.com/replit/codemirror-vscode-keymap
    editorMode.of({ type: 'vscode' }),
    keymap.of(vscodeKeymap),
  ],
  vim: [
    // https://github.com/replit/codemirror-vim
    vim(),
    editorMode.of({ type: 'vim', noTabster: true }),
    keymap.of([
      {
        key: 'Alt-Escape',
        run: (view) => {
          // Focus container for tab navigation.
          view.dispatch({ userEvent: focusEvent });
          return true;
        },
      },
    ]),
  ],
};
