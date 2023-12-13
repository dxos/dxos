//
// Copyright 2023 DXOS.org
//

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  placeholder,
  rectangularSelection,
} from '@codemirror/view';

import type { ThemeMode } from '@dxos/react-ui';

import { type ThemeStyles } from '../../../styles';

export type BasicBundleOptions = {
  theme?: ThemeStyles;
  themeMode?: ThemeMode;
  placeholder?: string;
};

export const basicBundle = ({ theme, themeMode, placeholder: _placeholder }: BasicBundleOptions): Extension[] =>
  [
    // TODO(burdon): Create custom bundle to make this class more reusable and retire simpler TextEditor component.
    // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
    // https://codemirror.net/docs/ref/#codemirror.basicSetup
    autocompletion(),
    bracketMatching(),
    closeBrackets(),
    crosshairCursor(),
    dropCursor(),
    drawSelection(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    highlightSpecialChars(),
    history(),
    indentOnInput(),
    _placeholder && placeholder(_placeholder), // TODO(burdon): Needs consistent styling.
    rectangularSelection(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,

    keymap.of([
      ...closeBracketsKeymap,
      ...completionKeymap,
      ...defaultKeymap,
      ...foldKeymap,
      ...historyKeymap,
      ...lintKeymap,
      ...searchKeymap,
      indentWithTab,
    ]),

    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
  ].filter(Boolean) as Extension[];
