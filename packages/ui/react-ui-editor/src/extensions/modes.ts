//
// Copyright 2024 DXOS.org
//

import { type Extension, Facet } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { vim } from '@replit/codemirror-vim';

export const focusEvent = 'focus.container';

export type EditorMode = 'default' | 'vim' | undefined;

export type EditorConfig = {
  type: string;
  noTabster?: boolean;
};

export const editorMode = Facet.define<EditorConfig, EditorConfig>({
  combine: (modes) => modes[0] ?? {},
});

export const EditorModes: { [mode: string]: Extension } = {
  default: [],
  vim: [
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
