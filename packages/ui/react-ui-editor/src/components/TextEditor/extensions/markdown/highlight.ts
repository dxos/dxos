//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { tags, styleTags, Tag } from '@lezer/highlight';
import { type MarkdownConfig } from '@lezer/markdown';
import get from 'lodash.get';

import { bold, heading, italic, mark, strikethrough, tokens } from '../../../../styles';

export const markdownTags = {
  codeBlock: Tag.define(),
  codeMark: Tag.define(),
  codeText: Tag.define(),
  emphasisMark: Tag.define(),
  headerMark: Tag.define(),
  inlineCode: Tag.define(),
  linkLabel: Tag.define(),
  linkMark: Tag.define(),
  linkReference: Tag.define(),
  listMark: Tag.define(),
  quoteMark: Tag.define(),
  url: Tag.define(),
};

/**
 * Markdown parser tags.
 * https://github.com/lezer-parser/markdown
 * https://github.com/lezer-parser/markdown/blob/main/src/markdown.ts
 * https://github.com/lezer-parser/highlight
 */
export const markdownTagsExtension: MarkdownConfig = {
  props: [
    styleTags({
      CodeBlock: markdownTags.codeBlock,
      CodeMark: markdownTags.codeMark,
      CodeText: markdownTags.codeText,
      EmphasisMark: markdownTags.emphasisMark,
      HeaderMark: markdownTags.headerMark,
      InlineCode: markdownTags.inlineCode,
      LinkLabel: markdownTags.linkLabel,
      LinkMark: markdownTags.linkMark,
      LinkReference: markdownTags.linkReference,
      ListMark: markdownTags.listMark,
      QuoteMark: markdownTags.quoteMark,
      URL: markdownTags.url,
    }),
  ],
};

/**
 * Styling based on `lezer` parser tags.
 * https://github.com/lezer-parser/markdown
 * https://codemirror.net/examples/styling
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
    {
      tag: [tags.link, tags.url],
      color: 'inherit !important',
      textDecoration: 'none !important',
    },
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      color: get(tokens, 'extend.colors.primary.500'),
      class: 'font-mono',
    },
    {
      tag: [
        markdownTags.codeMark,
        markdownTags.emphasisMark,
        markdownTags.headerMark,
        markdownTags.linkLabel,
        markdownTags.linkReference,
        markdownTags.listMark,
        markdownTags.quoteMark,
        tags.meta,
        tags.processingInstruction,
      ],
      class: mark,
    },
    {
      tag: [markdownTags.url],
      class: mark,
    },
    {
      tag: [markdownTags.codeBlock, markdownTags.codeText, markdownTags.inlineCode],
      // class: code,
    },
    { tag: tags.emphasis, class: italic },
    { tag: tags.heading1, class: heading[1] },
    { tag: tags.heading2, class: heading[2] },
    { tag: tags.heading3, class: heading[3] },
    { tag: tags.heading4, class: heading[4] },
    { tag: tags.heading5, class: heading[5] },
    { tag: tags.heading6, class: heading[6] },
    { tag: tags.strikethrough, class: strikethrough },
    { tag: tags.strong, class: bold },
    {
      tag: [tags.content],
      class: 'font-body',
    },
  ],
  {
    scope: markdownLanguage,
  },
);
