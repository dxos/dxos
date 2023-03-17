//
// Copyright 2023 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { parseInt } from 'lib0/number';
import React, { forwardRef, useEffect, useMemo } from 'react';
import { yCollab } from 'y-codemirror.next';

import { useThemeContext, configPalettes } from '@dxos/react-components';
import { YText } from '@dxos/text-model';
import { humanize } from '@dxos/util';

import { ComposerModel } from '../../model';
import { markdownDarkHighlighting, markdownDarktheme } from './markdownDark';
import { markdownTagsExtension } from './markdownTags';

export type MarkdownComposerSlots = {};

export type MarkdownComposerProps = {
  model?: ComposerModel;
  slots?: MarkdownComposerSlots;
};

export type MarkdownComposerRef = ReactCodeMirrorRef;

const theme = EditorView.theme(markdownDarktheme);

const hexadecimalPaletteSeries: (keyof typeof configPalettes)[] = [
  'red' as const,
  'orange' as const,
  'amber' as const,
  'yellow' as const,
  'lime' as const,
  'green' as const,
  'emerald' as const,
  'teal' as const,
  'cyan' as const,
  'sky' as const,
  'indigo' as const,
  'violet' as const,
  'purple' as const,
  'fuchsia' as const,
  'pink' as const,
  'rose' as const
];

const shadeKeys = {
  color: '450' as const,
  highlightDark: '800' as const,
  highlightLight: '100' as const
};

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
      let peerColorDigit = Math.floor(16 * Math.random());
      try {
        // `peer.id` is already a `string`, so we attempt `parseInt` within a `try` since we can’t be certain it is hexadecimal.
        peerColorDigit = parseInt(peer.id.slice(-1), 16);
      } catch (_) {}
      provider.awareness.setLocalStateField('user', {
        name: peer.name ?? humanize(peer.id),
        color: configPalettes[hexadecimalPaletteSeries[peerColorDigit]][shadeKeys.color],
        colorLight:
          configPalettes[hexadecimalPaletteSeries[peerColorDigit]][
            shadeKeys[themeMode === 'dark' ? 'highlightDark' : 'highlightLight']
          ]
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
