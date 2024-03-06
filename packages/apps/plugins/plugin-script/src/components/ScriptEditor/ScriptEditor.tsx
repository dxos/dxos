//
// Copyright 2023 DXOS.org
//

import { autocompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { type EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { type HoverInfo, tsAutocomplete, tsFacet, tsHover, tsLinter, tsSync } from '@valtown/codemirror-ts';
import { minimalSetup } from 'codemirror';
import React, { useEffect, useMemo } from 'react';

import { debounce } from '@dxos/async';
import { DocAccessor } from '@dxos/echo-schema';
import { type ThemeMode } from '@dxos/react-ui';
import { automerge, defaultTheme, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { type TS } from '../../ts';

export type ScriptEditorProps = {
  ts?: TS;
  path?: string;
  source: DocAccessor;
  themeMode?: ThemeMode;
  className?: string;
};

// TODO(burdon): Adapt syntax highlighting theme.
// punctuation, space, alias,
const styles = EditorView.baseTheme({
  '.cm-tooltip-info': {
    fontFamily: 'monospace',
    fontSize: '16px',
  },
  '.cm-tooltip-info-keyword': {
    color: '#708',
  },
  '.cm-tooltip-info-localName, .cm-tooltip-info-aliasName, .cm-tooltip-info-parameterName': {
    color: '#00f',
  },
  // '.cm-tooltip-info-interfaceName, .cm-tooltip-info-typeParameterName': {
  //   color: 'orange',
  // },
  '.cm-tooltip-info-stringLiteral': {
    color: '#a11',
  },
});

export const ScriptEditor = ({ ts, path, source, themeMode, className }: ScriptEditorProps) => {
  const checkImports =
    ts &&
    debounce((state: EditorState) => {
      syntaxTree(state).iterate({
        enter: (node) => {
          if (node.name === 'ImportDeclaration') {
            const [text] = state.doc.slice(node.from, node.to);
            void ts.loadImport(text);
          }
        },
      });
    }, 500);

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
      // TODO(burdon): Create worker (configure vite; need extension for plugin architecture?)
      //  https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
      ts && path
        ? [
            tsFacet.of({ env: ts.env, path }),
            tsSync(),
            tsLinter(),
            tsHover({
              renderTooltip: (info: HoverInfo) => {
                const div = document.createElement('div');
                if (info.quickInfo?.displayParts) {
                  for (const part of info.quickInfo.displayParts) {
                    // console.log(part.kind);
                    const span = div.appendChild(document.createElement('span'));
                    span.className = `cm-tooltip-info cm-tooltip-info-${part.kind}`;
                    span.innerText = part.text;
                  }
                }

                return { dom: div };
              },
            }),
            styles,
            autocompletion({
              override: [tsAutocomplete()],
            }),
            // Dynamically import types.
            checkImports
              ? EditorView.updateListener.of(({ state, changes }) => {
                  if (!changes.empty) {
                    checkImports(state);
                  }
                })
              : [],
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

  const { parentRef, view } = useTextEditor(
    {
      extensions,
      doc: DocAccessor.getValue(source),
    },
    [extensions],
  );

  useEffect(() => {
    view && checkImports?.(view.state);
  }, [view]);

  return <div ref={parentRef} className={mx('flex grow', className)} />;
};
