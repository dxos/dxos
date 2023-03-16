//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import React, { forwardRef, useEffect, useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { useThemeContext } from '@dxos/react-components';
import { YText } from '@dxos/text-model';
import { humanize } from '@dxos/util';

import { ComposerModel } from '../../model';
import { cursorColor } from '../../yjs';
import { markdownDarkHighlighting, markdownDarktheme } from './markdownDark';
import { markdownTagsExtension } from './markdownTags';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  model?: ComposerModel;
  slots?: MarkdownComposerSlots;
};

export type MarkdownComposerRef = ReactCodeMirrorRef;

const theme = EditorView.theme(markdownDarktheme);

export const MarkdownComposer = forwardRef<ReactCodeMirrorRef, MarkdownComposerProps>(({ model }, forwardedRef) => {
  const { id, content, provider, peer } = model ?? {};
  const { themeMode } = useThemeContext();

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [markdownTagsExtension] }),
      ...(content instanceof YText ? [yCollab(content, provider?.awareness)] : [])
    ],
    [content, provider?.awareness]
  );

  useEffect(() => {
    if (provider && peer) {
      provider.awareness.setLocalStateField('user', {
        name: peer.name ?? humanize(peer.id),
        // TODO(wittjosiah): Pick colours from theme based on identity key.
        color: cursorColor.color,
        colorLight: cursorColor.light
      });
    }
  }, [provider, peer]);

  return (
    <CodeMirror
      key={id}
      basicSetup={{ lineNumbers: false, foldGutter: false }}
      theme={[
        theme,
        ...(themeMode === 'dark'
          ? [syntaxHighlighting(oneDarkHighlightStyle)]
          : [syntaxHighlighting(defaultHighlightStyle)]),
        // TODO(thure): All but one rule here apply to both themes; rename or refactor.
        syntaxHighlighting(markdownDarkHighlighting)
      ]}
      ref={forwardedRef}
      value={content?.toString()}
      extensions={extensions}
    />
  );
});
