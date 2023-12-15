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
  CodeBlock: Tag.define(),
  CodeMark: Tag.define(),
  CodeText: Tag.define(),
  FencedCode: Tag.define(),
  EmphasisMark: Tag.define(),
  HeaderMark: Tag.define(),
  InlineCode: Tag.define(),
  LinkLabel: Tag.define(),
  LinkMark: Tag.define(),
  LinkReference: Tag.define(),
  ListMark: Tag.define(),
  QuoteMark: Tag.define(),
  URL: Tag.define(),
};

/**
 * Markdown parser tags.
 * https://github.com/lezer-parser/markdown
 * https://github.com/lezer-parser/markdown/blob/main/src/markdown.ts
 * https://github.com/lezer-parser/highlight
 */
export const markdownTagsExtension: MarkdownConfig = {
  props: [
    // TODO(burdon): Does this do anything?
    styleTags(markdownTags),
    styleTags({
      CodeBlock: markdownTags.CodeBlock,
      CodeMark: markdownTags.CodeMark,
      CodeText: markdownTags.CodeText,
      EmphasisMark: markdownTags.EmphasisMark,
      FencedCode: markdownTags.FencedCode,
      HeaderMark: markdownTags.HeaderMark,
      InlineCode: markdownTags.InlineCode,
      LinkLabel: markdownTags.LinkLabel,
      LinkMark: markdownTags.LinkMark,
      LinkReference: markdownTags.LinkReference,
      ListMark: markdownTags.ListMark,
      QuoteMark: markdownTags.QuoteMark,
      URL: markdownTags.URL,
    }),
  ],
};

console.log(markdownTagsExtension);

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
    // Markdown marks.
    {
      tag: [
        markdownTags.CodeMark,
        markdownTags.EmphasisMark,
        markdownTags.HeaderMark,
        markdownTags.LinkLabel,
        markdownTags.LinkReference,
        markdownTags.ListMark,
        markdownTags.QuoteMark,
        tags.meta,
        tags.processingInstruction,
      ],
      class: mark,
    },
    // Main content, paragraphs, etc.
    {
      tag: [tags.content],
      fontFamily: get(tokens, 'fontFamily.body', []).join(','),
    },
    // Headings.
    { tag: tags.heading1, class: heading[1] },
    { tag: tags.heading2, class: heading[2] },
    { tag: tags.heading3, class: heading[3] },
    { tag: tags.heading4, class: heading[4] },
    { tag: tags.heading5, class: heading[5] },
    { tag: tags.heading6, class: heading[6] },
    // Formatting.
    { tag: tags.strong, class: bold },
    { tag: tags.emphasis, class: italic },
    { tag: tags.strikethrough, class: strikethrough },
    // Naked URLs.
    {
      tag: [markdownTags.URL, tags.link, tags.url],
      color: 'inherit !important',
      textDecoration: 'none !important',
      fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
      fontSize: '11pt', // TODO(burdon): ???
      padding: '0 4px',
    },
    // E.g., code block language (after ```).
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      color: get(tokens, 'extend.colors.primary.500'),
      fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
      fontSize: '11pt',
    },
    // Fenced code blocks will be highlighted by custom syntax highlighters configured by the bundle,
    // IFF a language is defined (since the `codeLanguages` property is set in the `markdown` plugin).
    // Otherwise, we catch the code text here.
    {
      tag: [markdownTags.CodeText, markdownTags.InlineCode],
      fontFamily: get(tokens, 'fontFamily.mono', []).join(','),
      fontSize: '11pt',
      color: 'red',
    },
    {
      tag: [markdownTags.FencedCode, markdownTags.CodeBlock],
      color: 'red',
    },
  ],
  {
    scope: markdownLanguage,
    all: { fontFamily: get(tokens, 'fontFamily.body', []).join(',') },
  },
);
