//
// Copyright 2023 DXOS.org
//

import { completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';

import { type ThemeMode } from '@dxos/react-ui';
import { isNotFalsy } from '@dxos/util';

import { markdownHighlightStyle, markdownTagsExtensions } from './highlight';

export type MarkdownBundleOptions = {
  themeMode?: ThemeMode;
  indentWithTab?: boolean;
};

/**
 * Creates markdown extensions.
 * To be used in conjunction with createBasicExtensions.
 *
 * Refs:
 * https://codemirror.net/docs/community
 * https://codemirror.net/docs/ref/#codemirror.basicSetup
 */
export const createMarkdownExtensions = (options: MarkdownBundleOptions = {}): Extension[] => {
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

      // Don't complete HTML tags.
      completeHTMLTags: false,

      // Parser extensions.
      extensions: [
        // GFM provided by default.
        markdownTagsExtensions,
      ],
    }),

    // Custom styles.
    syntaxHighlighting(markdownHighlightStyle()),

    keymap.of(
      [
        // https://codemirror.net/docs/ref/#commands.indentWithTab
        options.indentWithTab !== false && indentWithTab,

        // https://codemirror.net/docs/ref/#commands.defaultKeymap
        ...defaultKeymap,
        ...completionKeymap,
      ].filter(isNotFalsy),
    ),
  ];
};
