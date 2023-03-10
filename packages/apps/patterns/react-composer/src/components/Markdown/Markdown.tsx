//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import get from 'lodash.get';
import React, { forwardRef } from 'react';
import { yCollab } from 'y-codemirror.next';

import { Text } from '@dxos/client';
import { tailwindConfig } from '@dxos/react-components';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  slots?: MarkdownComposerSlots;
};

export type MarkdownComposerRef = ReactCodeMirrorRef;

const tokens = tailwindConfig({}).theme;

console.log('[tailwind tokens]', tokens);

const theme = EditorView.theme({
  '&.cm-focused': {
    outline: 'none'
  },
  '& .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.100', '#00ffff') + 'aa'
  },
  '.dark & .cm-selectionBackground': {
    background: get(tokens, 'extend.colors.primary.500', '#00ffff') + 'aa'
  },
  '& .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.100', '#00ffff') + '44'
  },
  '.dark & .cm-selectionMatch': {
    background: get(tokens, 'extend.colors.primary.500', '#00ffff') + '44'
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
    background: get(tokens, 'extend.colors.neutral.850', '#000000') + '44'
  }
});

const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, class: 'mbs-4 mbe-2 text-4xl font-semibold decoration-none' },
  { tag: tags.heading2, class: 'mbs-4 mbe-2 text-3xl font-bold decoration-none' },
  { tag: tags.heading3, class: 'mbs-4 mbe-2 text-2xl font-bold decoration-none' },
  { tag: tags.heading4, class: 'mbs-4 mbe-2 text-xl font-extrabold decoration-none' },
  { tag: tags.heading5, class: 'mbs-4 mbe-2 text-lg font-extrabold decoration-none' },
  { tag: tags.heading6, class: 'mbs-4 mbe-2 font-black decoration-none' }
]);

export const MarkdownComposer = forwardRef<ReactCodeMirrorRef, MarkdownComposerProps>(({ text }, forwardedRef) => {
  const ytext = text?.doc?.getText('md');

  if (!ytext) {
    return null;
  }

  return (
    <CodeMirror
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      theme={[theme, syntaxHighlighting(markdownHighlightStyle)]}
      ref={forwardedRef}
      value={ytext.toString()}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        // TODO(wittjosiah): Create yjs awareness plugin using mesh.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        yCollab(ytext)
      ]}
    />
  );
});
