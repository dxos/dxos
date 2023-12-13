//
// Copyright 2023 DXOS.org
//

import { markdownLanguage, markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import type { Extension } from '@codemirror/state';
// import { GFM } from '@lezer/markdown';

import { type ThemeMode } from '@dxos/react-ui';

import { markdownTagsExtension } from './tags';
import { markdownHighlightStyle } from './theme';
import { type ThemeStyles } from '../../../../styles';

export type MarkdownBundleOptions = {
  themeMode?: ThemeMode;
  theme?: ThemeStyles;
};

export const markdownBundle = ({ themeMode, theme }: MarkdownBundleOptions): Extension[] => {
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

    // TODO(thure): All but one rule here apply to both themes; rename or refactor.
    syntaxHighlighting(markdownHighlightStyle),
  ];
};
