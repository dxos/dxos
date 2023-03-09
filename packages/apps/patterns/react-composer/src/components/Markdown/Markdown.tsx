//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';
import { yCollab } from 'y-codemirror.next';

import { Text } from '@dxos/client';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  slots?: MarkdownComposerSlots;
};

export const MarkdownComposer = ({ text }: MarkdownComposerProps) => {
  const ytext = text?.doc?.getText('md');

  if (!ytext) {
    return null;
  }

  return (
    <CodeMirror
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
};
