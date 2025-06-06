//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { vim } from '@replit/codemirror-vim';
import { vscodeKeymap } from '@replit/codemirror-vscode-keymap';
import { Schema } from 'effect';

import { singleValueFacet } from '../util';

export const EditorViewModes = ['preview', 'readonly', 'source'] as const;
export const EditorViewMode = Schema.Union(...EditorViewModes.map((mode) => Schema.Literal(mode)));
export type EditorViewMode = Schema.Schema.Type<typeof EditorViewMode>;

export const EditorInputModes = ['default', 'vim', 'vscode'] as const;
export const EditorInputMode = Schema.Union(...EditorInputModes.map((mode) => Schema.Literal(mode)));
export type EditorInputMode = Schema.Schema.Type<typeof EditorInputMode>;

export type EditorInputConfig = {
  type?: string;
  noTabster?: boolean;
};

export const editorInputMode = singleValueFacet<EditorInputConfig>({});

export const InputModeExtensions: { [mode: string]: Extension } = {
  default: [],
  vscode: [
    // https://github.com/replit/codemirror-vscode-keymap
    editorInputMode.of({ type: 'vscode' }),
    keymap.of(vscodeKeymap),
  ],
  vim: [
    // https://github.com/replit/codemirror-vim
    vim(),
    editorInputMode.of({ type: 'vim', noTabster: true }),
    keymap.of([
      {
        key: 'Alt-Escape',
        run: (view) => {
          // Focus container for tab navigation.
          view.dom.parentElement?.focus();
          return true;
        },
      },
    ]),
  ],
};
