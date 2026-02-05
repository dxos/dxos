//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { Tag, styleTags, tags } from '@lezer/highlight';
import { type MarkdownConfig, Table } from '@lezer/markdown';

import { fontBody, markdownTheme } from '../../styles';

/**
 * Custom tags defined and processed by the GFM lezer extension.
 * https://github.com/lezer-parser/markdown
 * https://github.com/lezer-parser/markdown/blob/main/src/markdown.ts
 */
export const markdownTags = {
  Blockquote: Tag.define(),
  CodeMark: Tag.define(),
  CodeText: Tag.define(),
  EmphasisMark: Tag.define(),
  HeaderMark: Tag.define(),
  InlineCode: Tag.define(),
  LinkLabel: Tag.define(),
  LinkReference: Tag.define(),
  ListMark: Tag.define(),
  QuoteMark: Tag.define(),
  URL: Tag.define(),

  // Custom.
  TableCell: Tag.define(),
};

// TODO(burdon): Customize table parser (make all content monospace).
//  https://github.com/lezer-parser/markdown/blob/main/src/extension.ts
Table.defineNodes?.forEach((node: any) => {
  switch (node?.name) {
    case 'TableCell': {
      node.style = markdownTags.TableCell;
      break;
    }
  }
});

export const markdownTagsExtensions: MarkdownConfig[] = [
  Table,
  {
    props: [styleTags(markdownTags)],
  },
];

export type HighlightOptions = {};

/**
 * Styling based on `lezer` parser tags.
 * https://codemirror.net/examples/styling
 * https://github.com/lezer-parser/highlight
 * https://github.com/lezer-parser/highlight/blob/main/src/highlight.ts#L427
 * https://lezer.codemirror.net/docs/ref/#highlight.tags (list of tags)
 *
 * Examples:
 * - https://github.com/codemirror/language/blob/main/src/highlight.ts#L194
 * - https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts#L115
 */
export const markdownHighlightStyle = (_options: HighlightOptions = {}) => {
  return HighlightStyle.define(
    [
      {
        tag: [
          tags.keyword,
          tags.name,
          tags.deleted,
          tags.character,
          tags.propertyName,
          tags.macroName,
          tags.color,
          tags.constant(tags.name),
          tags.standard(tags.name),
          tags.definition(tags.name),
          tags.separator,
          tags.typeName,
          tags.className,
          tags.number,
          tags.changed,
          tags.annotation,
          tags.modifier,
          tags.self,
          tags.namespace,
          tags.operator,
          tags.operatorKeyword,
          tags.escape,
          tags.regexp,
          tags.special(tags.string),
          tags.meta,
          tags.comment,
          tags.atom,
          tags.bool,
          tags.special(tags.variableName),
          tags.processingInstruction,
          tags.string,
          tags.inserted,
          tags.invalid,
        ],
        // TODO(burdon): Explain.
        color: 'inherit !important',
      },

      // Markdown marks.
      {
        tag: [
          tags.meta,
          tags.processingInstruction,
          markdownTags.LinkLabel,
          markdownTags.LinkReference,
          markdownTags.ListMark,
        ],
        class: markdownTheme.mark,
      },

      // Markdown marks.
      {
        tag: [
          //
          markdownTags.CodeMark,
          markdownTags.HeaderMark,
          markdownTags.QuoteMark,
          markdownTags.EmphasisMark,
        ],
        class: markdownTheme.mark,
      },

      // E.g., code block language (after ```).
      {
        tag: [
          //
          tags.function(tags.variableName),
          tags.labelName,
        ],
        class: markdownTheme.codeMark,
      },

      // Fonts.
      {
        tag: [tags.monospace, tags.comment],
        class: 'font-mono',
      },

      // Headings.
      { tag: tags.heading1, class: markdownTheme.heading(1) },
      { tag: tags.heading2, class: markdownTheme.heading(2) },
      { tag: tags.heading3, class: markdownTheme.heading(3) },
      { tag: tags.heading4, class: markdownTheme.heading(4) },
      { tag: tags.heading5, class: markdownTheme.heading(5) },
      { tag: tags.heading6, class: markdownTheme.heading(6) },

      // Emphasis.
      { tag: tags.emphasis, class: 'italic' },
      { tag: tags.strong, class: 'font-bold' },
      { tag: tags.strikethrough, class: 'line-through' },

      // NOTE: The `markdown` extension configures extensions for `lezer` to parse markdown tokens (incl. below).
      // However, since `codeLanguages` is also defined, the `lezer` will not parse fenced code blocks,
      // when a language is specified. In this case, the syntax highlighting extensions will colorize
      // the code, but all other CSS properties will be inherited.
      // IMPORTANT: Therefore, the fenced code block will use the base editor font unless changed by an extension.
      {
        tag: [markdownTags.CodeText, markdownTags.InlineCode],
        class: markdownTheme.code,
      },

      {
        tag: [markdownTags.TableCell],
        class: 'font-mono',
      },
    ],
    {
      scope: markdownLanguage,
      all: {
        fontFamily: fontBody,
      },
    },
  );
};
