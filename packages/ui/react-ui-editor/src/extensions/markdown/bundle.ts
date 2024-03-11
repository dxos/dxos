//
// Copyright 2023 DXOS.org
//

import { closeBracketsKeymap } from '@codemirror/autocomplete';
import { historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { searchKeymap } from '@codemirror/search';
import { type Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { keymap } from '@codemirror/view';

import { type ThemeMode } from '@dxos/react-ui';

import { markdownHighlightStyle, markdownTagsExtensions } from './highlight';

export type MarkdownBundleOptions = {
  themeMode?: ThemeMode;
};

/**
 * Creates markdown extensions.
 * To be used in conjunction with createBasicExtensions.
 *
 * Refs:
 * https://codemirror.net/docs/community
 * https://codemirror.net/docs/ref/#codemirror.basicSetup
 */
export const createMarkdownExtensions = ({ themeMode }: MarkdownBundleOptions = {}): Extension[] => {
  return [
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
        markdownTagsExtensions,
      ],
    }),

    // https://github.com/codemirror/theme-one-dark
    themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle),

    // Custom styles.
    syntaxHighlighting(markdownHighlightStyle()),

    keymap.of([
      // https://codemirror.net/docs/ref/#commands.indentWithTab
      indentWithTab,
      // https://codemirror.net/docs/ref/#autocomplete.closeBracketsKeymap
      ...closeBracketsKeymap,
      // https://codemirror.net/docs/ref/#commands.historyKeymap
      ...historyKeymap,
      // https://codemirror.net/docs/ref/#search.searchKeymap
      ...searchKeymap,
      // https://codemirror.net/docs/ref/#commands.standardKeymap
      ...standardKeymap,
    ]),
  ];
};
