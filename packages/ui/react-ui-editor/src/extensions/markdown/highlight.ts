//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { tags, styleTags, Tag } from '@lezer/highlight';
import { type MarkdownConfig, Table } from '@lezer/markdown';

import {
  blockquote,
  bold,
  code,
  codeMark,
  getToken,
  heading,
  inlineUrl,
  italic,
  mark,
  strikethrough,
} from '../../styles';

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
export const markdownHighlightStyle = (readonly?: boolean) => {
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
        class: mark,
      },

      // Markdown marks.
      {
        tag: [markdownTags.CodeMark, markdownTags.HeaderMark, markdownTags.QuoteMark, markdownTags.EmphasisMark],
        class: mark,
      },

      // E.g., code block language (after ```).
      {
        tag: [tags.function(tags.variableName), tags.labelName],
        class: codeMark,
      },

      {
        tag: [tags.monospace],
        class: 'font-mono',
      },

      // Headings.
      { tag: tags.heading1, class: heading(1) },
      { tag: tags.heading2, class: heading(2) },
      { tag: tags.heading3, class: heading(3) },
      { tag: tags.heading4, class: heading(4) },
      { tag: tags.heading5, class: heading(5) },
      { tag: tags.heading6, class: heading(6) },

      // Emphasis.
      { tag: tags.emphasis, class: italic },
      { tag: tags.strong, class: bold },
      { tag: tags.strikethrough, class: strikethrough },

      // Naked URLs.
      {
        tag: [markdownTags.URL],
        class: inlineUrl,
      },

      // NOTE: The `markdown` extension configures extensions for `lezer` to parse markdown tokens (incl. below).
      // However, since `codeLanguages` is also defined, the `lezer` will not parse fenced code blocks,
      // when a language is specified. In this case, the syntax highlighting extensions will colorize
      // the code, but all other CSS properties will be inherited.
      // IMPORTANT: Therefore, the fenced code block will use the base editor font unless changed by an extension.
      {
        tag: [markdownTags.CodeText, markdownTags.InlineCode],
        class: code,
      },

      {
        tag: [markdownTags.QuoteMark],
        class: blockquote,
      },

      {
        tag: [markdownTags.TableCell],
        class: 'font-mono',
      },
    ],
    {
      scope: markdownLanguage,
      all: {
        fontFamily: getToken('fontFamily.body', []).join(','),
      },
    },
  );
};
