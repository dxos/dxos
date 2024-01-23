//
// Copyright 2023 DXOS.org
//

import { closeBrackets } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { drawSelection, EditorView, highlightActiveLine, placeholder } from '@codemirror/view';

import { type ThemeMode } from '@dxos/react-ui';

import { type TextEditorProps } from '../components';

export type BasicBundleOptions = {
  themeMode?: ThemeMode;
} & Pick<TextEditorProps, 'placeholder' | 'multiline'>;

export const basicBundle = ({
  themeMode,
  placeholder: _placeholder,
  multiline = true,
}: BasicBundleOptions): Extension[] => [
  multiline ? EditorView.lineWrapping : [],

  // https://codemirror.net/docs/ref/#codemirror.minimalSetup
  bracketMatching(),
  closeBrackets(),
  drawSelection(),
  highlightActiveLine(),
  history(),
  _placeholder ? placeholder(_placeholder) : [],

  // https://github.com/codemirror/theme-one-dark
  themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
];
