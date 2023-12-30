//
// Copyright 2023 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
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

import { markdownHighlightStyle, markdownTagsExtension } from './highlight';

export type MarkdownBundleOptions = {
  readonly?: boolean;
  themeMode?: ThemeMode;
  placeholder?: string;
};

export const markdownBundle = ({
  readonly,
  themeMode,
  placeholder: _placeholder,
}: MarkdownBundleOptions): Extension[] => {
  // All of https://github.com/codemirror/basic-setup minus line numbers and fold gutter.
  // https://codemirror.net/docs/ref/#codemirror.basicSetup
  return [
    bracketMatching(),
    closeBrackets(),
    _placeholder && placeholder(_placeholder),

    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,

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

    customkeymap(),

    // Main extension.
    // https://github.com/codemirror/lang-markdown
    // https://codemirror.net/5/mode/markdown/index.html (demo).
    markdown({
      // GRM by default (vs strict CommonMark):
      // Table, TaskList, Strikethrough, and Autolink.
      // NOTE: This extends the parser; it doesn't affect rendering.
      // https://github.github.com/gfm
      // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
      base: markdownLanguage,

      // Languages for syntax highlighting fenced code blocks.
      codeLanguages: languages,

      // Parser extensions.
      extensions: [
        // GFM provided by default.
        markdownTagsExtension,
      ],
    }),

    // https://github.com/codemirror/theme-one-dark
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),

    // Custom styles.
    syntaxHighlighting(markdownHighlightStyle(readonly)),
  ].filter(Boolean) as Extension[];
};

// https://codemirror.net/docs/ref/#view.keymap
const customkeymap = () =>
  keymap.of([
    // https://codemirror.net/docs/ref/#commands.indentWithTab
    indentWithTab,
    // https://codemirror.net/docs/ref/#commands.standardKeymap
    ...standardKeymap,
    // https://codemirror.net/docs/ref/#commands.historyKeymap
    ...historyKeymap,
    // https://codemirror.net/docs/ref/#autocomplete.closeBracketsKeymap
    ...closeBracketsKeymap,
    // https://codemirror.net/docs/ref/#search.searchKeymap
    ...searchKeymap,
  ]);
