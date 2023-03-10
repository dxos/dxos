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
import React, { forwardRef, useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { Space, Text } from '@dxos/client';
import { tailwindConfig } from '@dxos/react-components';

import { cursorColor, SpaceProvider } from '../../yjs';
import { bold, heading, italic, mark, strikethrough } from '../../styles';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  space?: Space;
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
    backgroundColor: 'transparent'
  },
  '.dark & .cm-activeLine': {
    backgroundColor: 'transparent'
  }
});

const markdownTags = {
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
  linkLabel: Tag.define()
};

const markdownTagsExtension: MarkdownConfig = {
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
      LinkLabel: markdownTags.linkLabel
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
  { tag: markdownTags.url, class: mark },
  { tag: markdownTags.linkLabel, class: mark },
  { tag: markdownTags.linkReference, class: mark },
  { tag: markdownTags.codeText, class: 'font-mono' },
  { tag: markdownTags.inlineCode, class: 'font-mono' },
  { tag: tags.heading1, class: heading[1] },
  { tag: tags.heading2, class: heading[2] },
  { tag: tags.heading3, class: heading[3] },
  { tag: tags.heading4, class: heading[4] },
  { tag: tags.heading5, class: heading[5] },
  { tag: tags.heading6, class: heading[6] },
  { tag: tags.strikethrough, class: strikethrough },
  { tag: tags.emphasis, class: italic },
  { tag: tags.strong, class: bold }
]);

export const MarkdownComposer = forwardRef<ReactCodeMirrorRef, MarkdownComposerProps>(({ text, space }, forwardedRef) => {
  const ytext = text?.doc?.getText('md');

  const { awareness } = useMemo(() => {
    if (!space || !text?.doc) {
      return { awareness: null };
    }

    const provider = new SpaceProvider({ space, doc: text.doc });
    provider.awareness.setLocalStateField('user', {
      name: 'Anonymous ' + Math.floor(Math.random() * 100),
      color: cursorColor.color,
      colorLight: cursorColor.light
    });

    return provider;
  }, [space, text?.doc]);

  if (!ytext) {
    return null;
  }

  return (
    <CodeMirror
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      theme={[theme, syntaxHighlighting(generalHighlightStyle)]}
      ref={forwardedRef}
      value={ytext.toString()}
      extensions={[markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }), yCollab(ytext, awareness)]}
    />
  );
});
