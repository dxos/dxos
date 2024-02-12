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
import { isNotFalsy } from '@dxos/util';

import { type TextEditorProps } from '../components';

export type BasicBundleOptions = {
  themeMode?: ThemeMode;
  bracketMatching?: boolean;
} & Pick<TextEditorProps, 'placeholder' | 'lineWrapping'>;

export const createBasicBundle = ({
  themeMode,
  placeholder: _placeholder,
  lineWrapping = true,
  bracketMatching: _bracketMatching = true,
}: BasicBundleOptions = {}): Extension[] =>
  [
    lineWrapping && EditorView.lineWrapping,

    // https://codemirror.net/docs/ref/#codemirror.minimalSetup
    _bracketMatching && bracketMatching(),
    closeBrackets(),
    drawSelection(),
    highlightActiveLine(),
    history(),
    _placeholder && placeholder(_placeholder),

    // https://github.com/codemirror/theme-one-dark
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
  ].filter(isNotFalsy);
