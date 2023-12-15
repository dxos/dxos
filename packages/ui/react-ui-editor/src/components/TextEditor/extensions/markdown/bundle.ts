//
// Copyright 2023 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { bracketMatching, foldKeymap, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { lintKeymap } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
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
      // GRM by default (vs strict CommonMark):
      // Table, TaskList, Strikethrough, and Autolink.
      // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
      // https://github.github.com/gfm
      base: markdownLanguage,

      // Languages to support highlighting fenced code blocks.
      codeLanguages: languages,

      extensions: [
        // Custom styling.
        markdownTagsExtension,
      ],
    }),

    // Custom styles.
    syntaxHighlighting(markdownHighlightStyle),

    // TODO(thure): All but one rule here apply to both themes; rename or refactor.
    // themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),
  ].filter(Boolean) as Extension[];
};
