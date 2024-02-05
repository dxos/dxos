//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { vim } from '@replit/codemirror-vim';

export type EditorMode = 'default' | 'vim' | undefined;

export const EditorModes: { [mode: string]: Extension | undefined } = {
  default: undefined,
  vim: vim(),
};
