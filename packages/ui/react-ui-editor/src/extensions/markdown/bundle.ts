//
// Copyright 2023 DXOS.org
//

import { completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { jsonLanguage } from '@codemirror/lang-json';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { xml } from '@codemirror/lang-xml';
import { LanguageDescription, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { type MarkdownConfig } from '@lezer/markdown';

import { isTruthy } from '@dxos/util';

import { markdownHighlightStyle, markdownTagsExtensions } from './highlight';

export type MarkdownBundleOptions = {
  extensions?: MarkdownConfig[];
  indentWithTab?: boolean;
  setextHeading?: boolean;
};

/**
 * Creates markdown extensions.
 * To be used in conjunction with createBasicExtensions.
 *
 * Refs:
 * https://codemirror.net/docs/community
 * https://codemirror.net/docs/ref/#codemirror.basicSetup
 */
export const createMarkdownExtensions = (options: MarkdownBundleOptions = {}): Extension[] => [
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
    defaultCodeLanguage: jsonLanguage,
    codeLanguages: languages,

    // Don't complete HTML tags.
    completeHTMLTags: false,

    // Parser extensions.
    extensions: [
      // GFM provided by default.
      markdownTagsExtensions,
      ...(options.extensions ?? defaultExtensions()),
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

      // TODO(burdon): Remove?
      ...completionKeymap,
    ].filter(isTruthy),
  ),
];

const xmlLanguageDesc = LanguageDescription.of({
  name: 'xml',
  alias: ['html', 'xhtml'],
  extensions: ['xml', 'xhtml'],
  load: async () => xml(),
});

/**
 * Default customizations.
 * https://github.com/lezer-parser/markdown/blob/main/src/markdown.ts
 */
export const defaultExtensions = (): MarkdownConfig[] => [noSetExtHeading, noHtml];

/**
 * Remove SetextHeading (e.g., headings created from "---").
 */
const noSetExtHeading: MarkdownConfig = {
  remove: ['SetextHeading'],
};

/**
 * Remove HTML and XML parsing.
 */
const noHtml: MarkdownConfig = {
  // remove: ['HTMLBlock', 'HTMLTag'],
};
