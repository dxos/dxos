//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import CodeMirror from '@uiw/react-codemirror';
import React, { useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { Space, Text } from '@dxos/client';

import { cursorColor, SpaceProvider } from '../../yjs';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  space?: Space;
  slots?: MarkdownComposerSlots;
};

export const MarkdownComposer = ({ text, space }: MarkdownComposerProps) => {
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
      value={ytext.toString()}
      extensions={[markdown({ base: markdownLanguage, codeLanguages: languages }), yCollab(ytext, awareness)]}
    />
  );
};
