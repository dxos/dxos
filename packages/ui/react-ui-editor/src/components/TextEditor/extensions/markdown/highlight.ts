//
// Copyright 2023 DXOS.org
//

import { markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import get from 'lodash.get';

import { markdownTags } from './tags';
import { bold, heading, italic, mark, strikethrough, tokens } from '../../../../styles';

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
    { tag: [markdownTags.codeText, markdownTags.inlineCode], class: 'font-mono' },
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
  { scope: markdownLanguage, all: { fontFamily: get(tokens, 'fontFamily.body', []).join(',') } },
);
