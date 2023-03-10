//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { styleTags, tags, Tag } from '@lezer/highlight';
import { MarkdownConfig } from '@lezer/markdown';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import get from 'lodash.get';
import React, { forwardRef } from 'react';
import { yCollab } from 'y-codemirror.next';

import { Text } from '@dxos/client';
import { tailwindConfig } from '@dxos/react-components';

import { blockquote, bold, code, heading, horizontalRule, italic, mark, strikethrough } from '../../styles';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  slots?: MarkdownComposerSlots;
};

export type MarkdownComposerRef = ReactCodeMirrorRef;

const tokens = tailwindConfig({}).theme;

const theme = EditorView.theme({
  '&.cm-focused': {
    outline: 'none'
  },
  '& .cm-line': {
    paddingInline: '1.5rem'
  },
  '& .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.150', '#00ffff') + 'aa'
  },
  '.dark & .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.500', '#00ffff') + 'aa'
  },
  '& .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.100', '#00ffff') + '44'
  },
  '.dark & .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.400', '#00ffff') + '44'
  },
  '& .cm-cursor': {
    borderLeftColor: 'black'
  },
  '.dark & .cm-cursor': {
    borderLeftColor: 'white'
  },
  '& .cm-scroller': {
    fontFamily: get(tokens, 'fontFamily.body', []).join(',')
  },
  '& .cm-activeLine': {
    backgroundColor: get(tokens, 'extend.colors.neutral.100', '#ffffff') + '44'
  },
  '.dark & .cm-activeLine': {
    background: get(tokens, 'extend.colors.neutral.750', '#000000') + '44'
  }
});

const markdownTags = {
  headingMark: Tag.define(),
  quoteMark: Tag.define(),
  listMark: Tag.define(),
  linkMark: Tag.define(),
  emphasisMark: Tag.define(),
  codeMark: Tag.define()
};

const markdownTagsExtension: MarkdownConfig = {
  props: [
    styleTags({
      HeaderMark: markdownTags.headingMark,
      QuoteMark: markdownTags.quoteMark,
      ListMark: markdownTags.listMark,
      LinkMark: markdownTags.linkMark,
      EmphasisMark: markdownTags.emphasisMark,
      CodeMark: markdownTags.codeMark
    })
  ]
};

const generalHighlightStyle = HighlightStyle.define([
  { tag: markdownTags.headingMark, class: mark },
  { tag: markdownTags.quoteMark, class: mark },
  { tag: markdownTags.listMark, class: mark },
  { tag: markdownTags.linkMark, class: mark },
  { tag: markdownTags.emphasisMark, class: mark },
  { tag: markdownTags.codeMark, class: mark },
  { tag: tags.heading1, class: heading[1] },
  { tag: tags.heading2, class: heading[2] },
  { tag: tags.heading3, class: heading[3] },
  { tag: tags.heading4, class: heading[4] },
  { tag: tags.heading5, class: heading[5] },
  { tag: tags.heading6, class: heading[6] },
  { tag: tags.monospace, class: code },
  { tag: tags.strikethrough, class: strikethrough },
  { tag: tags.quote, class: blockquote },
  { tag: tags.contentSeparator, class: horizontalRule },
  { tag: tags.emphasis, class: italic },
  { tag: tags.strong, class: bold }
]);

export const MarkdownComposer = forwardRef<ReactCodeMirrorRef, MarkdownComposerProps>(({ text }, forwardedRef) => {
  const ytext = text?.doc?.getText('md');

  if (!ytext) {
    return null;
  }

  return (
    <CodeMirror
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      theme={[theme, syntaxHighlighting(generalHighlightStyle)]}
      ref={forwardedRef}
      value={ytext.toString()}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }),
        // TODO(wittjosiah): Create yjs awareness plugin using mesh.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        yCollab(ytext)
      ]}
    />
  );
});
