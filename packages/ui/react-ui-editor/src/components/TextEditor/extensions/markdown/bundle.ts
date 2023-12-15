//
// Copyright 2023 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { languages } from '@codemirror/language-data';
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
import { GFM } from '@lezer/markdown';

import type { ThemeMode } from '@dxos/react-ui';

import { markdownHighlightStyle, markdownTagsExtension } from './highlight';

export type MarkdownBundleOptions = {
  themeMode?: ThemeMode;
  placeholder?: string;
};

export const markdownBundle = ({ themeMode, placeholder: _placeholder }: MarkdownBundleOptions): Extension[] => {
  // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
  // https://codemirror.net/docs/ref/#codemirror.basicSetup
  return [
    bracketMatching(),
    closeBrackets(),
    _placeholder && placeholder(_placeholder),

    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,

    // autocompletion(),
    crosshairCursor(),
    dropCursor(),
    drawSelection(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    highlightSpecialChars(),
    history(),
    indentOnInput(),
    rectangularSelection(),

    keymap.of([
      ...closeBracketsKeymap,
      // ...completionKeymap,
      ...defaultKeymap,
      ...foldKeymap,
      ...historyKeymap,
      ...lintKeymap,
      ...searchKeymap,
      indentWithTab,
    ]),

    // Main extension.
    // https://github.com/codemirror/lang-markdown
    // https://codemirror.net/5/mode/markdown/index.html (demo).
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      extensions: [
        // TODO(burdon): This seems to upgrade the parser.
        // GitHub flavored markdown bundle: Table, TaskList, Strikethrough, and Autolink.
        // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
        // https://github.github.com/gfm
        GFM,

        // Custom styling.
        markdownTagsExtension,
      ],
    }),

    // TODO(thure): All but one rule here apply to both themes; rename or refactor.
    syntaxHighlighting(markdownHighlightStyle),
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
  ].filter(Boolean) as Extension[];
};
