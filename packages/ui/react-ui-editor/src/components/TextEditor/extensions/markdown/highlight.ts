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
  headingMark: Tag.define(),
  quoteMark: Tag.define(),
  listMark: Tag.define(),
  linkMark: Tag.define(),
  emphasisMark: Tag.define(),
  codeBlock: Tag.define(),
  codeMark: Tag.define(),
  codeText: Tag.define(),
  inlineCode: Tag.define(),
  url: Tag.define(),
  linkReference: Tag.define(),
  linkLabel: Tag.define(),
};

/**
 * https://github.com/lezer-parser/highlight
 * https://github.com/lezer-parser/markdown
 * https://github.com/lezer-parser/markdown/blob/main/src/markdown.ts
 */
export const markdownTagsExtension: MarkdownConfig = {
  props: [
    styleTags({
      HeaderMark: markdownTags.headingMark,
      QuoteMark: markdownTags.quoteMark,
      ListMark: markdownTags.listMark,
      LinkMark: markdownTags.linkMark,
      EmphasisMark: markdownTags.emphasisMark,
      CodeBlock: markdownTags.codeBlock,
      CodeText: markdownTags.codeText,
      CodeMark: markdownTags.codeMark,
      InlineCode: markdownTags.inlineCode,
      URL: markdownTags.url,
      LinkReference: markdownTags.linkReference,
      LinkLabel: markdownTags.linkLabel,
    }),
  ],
};

// TODO(burdon): Replace with class assignment.
const monospace = get(tokens, 'fontFamily.mono', ['monospace']).join(',');

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
      class: 'text-red-400',
    },
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      color: get(tokens, 'extend.colors.primary.500'),
      fontFamily: monospace,
    },
    {
      tag: [
        markdownTags.codeMark,
        markdownTags.emphasisMark,
        markdownTags.headingMark,
        markdownTags.linkLabel,
        markdownTags.linkReference,
        markdownTags.listMark,
        markdownTags.quoteMark,
        markdownTags.url,
        tags.meta,
        tags.processingInstruction,
      ],
      class: mark,
    },
    {
      tag: [markdownTags.codeBlock, markdownTags.codeText, markdownTags.inlineCode],
      fontFamily: monospace,
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
  ],
  {
    scope: markdownLanguage,
    all: { fontFamily: get(tokens, 'fontFamily.body', []).join(',') },
  },
);
