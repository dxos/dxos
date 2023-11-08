//
// Copyright 2023 DXOS.org
//

import { styleTags, Tag } from '@lezer/highlight';
import { type MarkdownConfig } from '@lezer/markdown';

export const markdownTags = {
  headingMark: Tag.define(),
  quoteMark: Tag.define(),
  listMark: Tag.define(),
  linkMark: Tag.define(),
  emphasisMark: Tag.define(),
  codeMark: Tag.define(),
  codeText: Tag.define(),
  inlineCode: Tag.define(),
  url: Tag.define(),
  linkReference: Tag.define(),
  linkLabel: Tag.define(),
};

export const markdownTagsExtension: MarkdownConfig = {
  props: [
    styleTags({
      HeaderMark: markdownTags.headingMark,
      QuoteMark: markdownTags.quoteMark,
      ListMark: markdownTags.listMark,
      LinkMark: markdownTags.linkMark,
      EmphasisMark: markdownTags.emphasisMark,
      CodeMark: markdownTags.codeMark,
      CodeText: markdownTags.codeText,
      InlineCode: markdownTags.inlineCode,
      URL: markdownTags.url,
      LinkReference: markdownTags.linkReference,
      LinkLabel: markdownTags.linkLabel,
    }),
  ],
};
