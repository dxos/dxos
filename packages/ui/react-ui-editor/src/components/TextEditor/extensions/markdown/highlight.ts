//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { tags, styleTags, Tag } from '@lezer/highlight';
import { type MarkdownConfig } from '@lezer/markdown';
import get from 'lodash.get';

import {
  bold,
  inlineUrl,
  codeMark,
  heading,
  italic,
  strikethrough,
  tokens,
  horizontalRule,
  code,
  mark,
} from '../../../../styles';

/**
 * Custom tags defined and processed by the GFM lezer extension.
 * https://github.com/lezer-parser/markdown
 * https://github.com/lezer-parser/markdown/blob/main/src/markdown.ts
 */
export const markdownTags = {
  // TODO(burdon): Parsing bug? How to test?
  //  https://discuss.codemirror.net/t/markdown-blockquote-isnt-getting-parsed/7578
  Blockquote: Tag.define(),

  CodeMark: Tag.define(),
  CodeText: Tag.define(),
  EmphasisMark: Tag.define(),
  HeaderMark: Tag.define(),
  HorizontalRule: Tag.define(),
  InlineCode: Tag.define(),
  LinkLabel: Tag.define(),
  LinkReference: Tag.define(),
  ListMark: Tag.define(),
  QuoteMark: Tag.define(),
  URL: Tag.define(),
};

export const markdownTagsExtension: MarkdownConfig = {
  props: [styleTags(markdownTags)],
};

/**
 * Styling based on `lezer` parser tags.
 * https://codemirror.net/examples/styling
 * https://github.com/lezer-parser/highlight
 * https://lezer.codemirror.net/docs/ref/#highlight (list of tags)
 */
export const markdownHighlightStyle = HighlightStyle.define(
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
        markdownTags.CodeMark,
        markdownTags.EmphasisMark,
        markdownTags.HeaderMark,
        markdownTags.LinkLabel,
        markdownTags.LinkReference,
        markdownTags.ListMark,
        markdownTags.QuoteMark,
      ],
      class: mark,
    },

    // Headings.
    { tag: tags.heading1, class: heading[1] },
    { tag: tags.heading2, class: heading[2] },
    { tag: tags.heading3, class: heading[3] },
    { tag: tags.heading4, class: heading[4] },
    { tag: tags.heading5, class: heading[5] },
    { tag: tags.heading6, class: heading[6] },

    // Emphasis.
    { tag: tags.emphasis, class: italic },
    { tag: tags.strong, class: bold },
    { tag: tags.strikethrough, class: strikethrough },

    // Naked URLs.
    {
      tag: [markdownTags.URL],
      class: inlineUrl,
    },

    // E.g., code block language (after ```).
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      class: codeMark,
    },

    // The `markdown` extension configures extensions for `lezer` to parse markdown tokens (incl. below).
    // However, since `codeLanguages` is also defined, the `lezer` will not parse fenced code blocks,
    // when a language is specified. In this case, the syntax highlighting extensions will colorize
    // the code, but all other CSS properties will be inherited.
    {
      tag: [markdownTags.CodeText, markdownTags.InlineCode],
      class: code,
    },

    // TODO(burdon): Not working.
    {
      tag: [markdownTags.Blockquote],
      color: 'green',
    },

    {
      tag: [markdownTags.HorizontalRule],
      class: horizontalRule,
    },

    // Main content, paragraphs, etc.
    // {
    //   tag: [tags.content],
    //   fontFamily: get(tokens, 'fontFamily.body', []).join(','),
    // },
  ],
  {
    scope: markdownLanguage,
    all: { fontFamily: get(tokens, 'fontFamily.body', []).join(',') },
  },
);
