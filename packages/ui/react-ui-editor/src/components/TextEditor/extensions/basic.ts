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
  readonly?: boolean;
  themeMode?: ThemeMode;
  placeholder?: string;
};

export const basicBundle = ({ readonly, themeMode, placeholder: _placeholder }: BasicBundleOptions): Extension[] =>
  [
    // TODO(burdon): Compare with minimalSetup.
    // https://codemirror.net/docs/ref/#codemirror.minimalSetup
    bracketMatching(),
    closeBrackets(),
    EditorView.lineWrapping,

    _placeholder && placeholder(_placeholder),

    // TODO(burdon): Is this required?
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
  ].filter(Boolean) as Extension[];
