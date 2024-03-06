//
// Copyright 2023 DXOS.org
//

import { autocompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { EditorView, lineNumbers } from '@codemirror/view';
import { tsAutocomplete, tsFacet, tsHover, tsLinter, tsSync } from '@valtown/codemirror-ts';
import { minimalSetup } from 'codemirror';
import React, { useMemo } from 'react';

import { DocAccessor } from '@dxos/echo-schema';
import { type ThemeMode } from '@dxos/react-ui';
import { automerge, defaultTheme, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { type TS } from '../../ts';

export type ScriptEditorProps = {
  source: DocAccessor;
  themeMode?: ThemeMode;
  className?: string;
  ts?: TS;
  path?: string;
};

export const ScriptEditor = ({ source, themeMode, className, ts, path }: ScriptEditorProps) => {
  const extensions = useMemo(
    () => [
      // TODO(burdon): Use basic set-up (e.g., bracket matching).
      minimalSetup,
      lineNumbers(),

      // TODO(burdon): Syntax highlighting theme.
      javascript({
        typescript: true,
        jsx: true,
      }),

      // https://github.com/val-town/codemirror-ts
      // TODO(burdon): Extend tooltip to show TS type info (not just errors).
      // TODO(burdon): Worker: https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
      ts && path
        ? [
            tsFacet.of({ env: ts.env, path }),
            tsSync(),
            tsHover(),
            tsLinter(),
            autocompletion({
              override: [tsAutocomplete()],
            }),
            EditorView.updateListener.of(({ state }) => {
              syntaxTree(state).iterate({
                enter: (node) => {
                  if (node.name === 'ImportDeclaration') {
                    const [text] = state.doc.slice(node.from, node.to);
                    void ts.import(text);
                  }
                },
              });
            }),
          ]
        : [],

      EditorView.baseTheme(defaultTheme),
      EditorView.darkTheme.of(themeMode === 'dark'),
      EditorView.contentAttributes.of({ class: '!px-2' }),

      // TODO(burdon): Add presence.
      automerge(source),
    ],
    [source, themeMode, ts, path],
  );

  const { parentRef } = useTextEditor(
    {
      extensions,
      doc: DocAccessor.getValue(source),
    },
    [extensions],
  );

  return <div ref={parentRef} className={mx('flex grow', className)} />;
};
