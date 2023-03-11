//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { forwardRef, useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { Space, Text } from '@dxos/client';

import { cursorColor, SpaceProvider } from '../../yjs';
import { markdownDarkHighlighting, markdownDarktheme } from './markdownDark';
import { markdownTagsExtension } from './markdownTags';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  space?: Space;
  slots?: MarkdownComposerSlots;
};

export type MarkdownComposerRef = ReactCodeMirrorRef;

const theme = EditorView.theme(markdownDarktheme);

export const MarkdownComposer = forwardRef<ReactCodeMirrorRef, MarkdownComposerProps>(
  ({ text, space }, forwardedRef) => {
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
        theme={[theme, syntaxHighlighting(oneDarkHighlightStyle), syntaxHighlighting(markdownDarkHighlighting)]}
        ref={forwardedRef}
        value={ytext.toString()}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }),
          yCollab(ytext, awareness)
        ]}
      />
    );
  }
);
