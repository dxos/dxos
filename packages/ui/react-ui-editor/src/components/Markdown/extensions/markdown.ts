//
// Copyright 2023 DXOS.org
//

import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import type { Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
// import { GFM } from '@lezer/markdown';

import { type ThemeMode } from '@dxos/react-ui';

import { markdownTagsExtension } from '../markdownTags';
import { markdownHighlightStyle, markdownTheme, type Styles } from '../markdownTheme';

export type MarkdownOptions = {
  themeMode?: ThemeMode;
  theme?: Styles;
};

// TODO(burdon): Rename.
export const markdownBundle = ({ themeMode, theme }: MarkdownOptions): Extension[] => {
  return [
    // Main extension.
    // https://github.com/codemirror/lang-markdown
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      extensions: [
        // TODO(burdon): This seems to upgrade the parser.
        // GitHub flavored markdown bundle: Table, TaskList, Strikethrough, and Autolink.
        // https://github.com/lezer-parser/markdown?tab=readme-ov-file#github-flavored-markdown
        // https://github.github.com/gfm
        // GFM,

        // Custom styling.
        markdownTagsExtension,
      ],
    }),

    // Theme.
    EditorView.theme({ ...markdownTheme, ...theme }),
    ...(themeMode === 'dark'
      ? [syntaxHighlighting(oneDarkHighlightStyle)]
      : [syntaxHighlighting(defaultHighlightStyle)]),

    // TODO(thure): All but one rule here apply to both themes; rename or refactor.
    syntaxHighlighting(markdownHighlightStyle),
  ];
};
