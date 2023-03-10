//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { forwardRef } from 'react';
import { yCollab } from 'y-codemirror.next';

import { Text } from '@dxos/client';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  text?: Text;
  slots?: MarkdownComposerSlots;
};

export type MarkdownComposerRef = ReactCodeMirrorRef;

export const MarkdownComposer = forwardRef<ReactCodeMirrorRef, MarkdownComposerProps>(({ text }, forwardedRef) => {
  const ytext = text?.doc?.getText('md');

  if (!ytext) {
    return null;
  }

  return (
    <CodeMirror
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      theme='none'
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
