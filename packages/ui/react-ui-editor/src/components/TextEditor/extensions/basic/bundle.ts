//
// Copyright 2023 DXOS.org
//

import { closeBrackets } from '@codemirror/autocomplete';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView, placeholder } from '@codemirror/view';

import type { ThemeMode } from '@dxos/react-ui';

export type BasicBundleOptions = {
  themeMode?: ThemeMode;
  placeholder?: string;
};

export const basicBundle = ({ themeMode, placeholder: _placeholder }: BasicBundleOptions): Extension[] =>
  [
    bracketMatching(),
    closeBrackets(),
    _placeholder && placeholder(_placeholder),

    EditorView.lineWrapping,

    // TODO(burdon): Is this required?
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
  ].filter(Boolean) as Extension[];
