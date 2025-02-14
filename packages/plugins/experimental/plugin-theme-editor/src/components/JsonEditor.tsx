//
// Copyright 2025 DXOS.org
//

import { json } from '@codemirror/lang-json';
import React, { useMemo } from 'react';

import { log } from '@dxos/log';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createThemeExtensions,
  editorFullWidth,
  editorMonospace,
  useTextEditor,
  EditorView,
  folding,
} from '@dxos/react-ui-editor';
import { userDefaultTokenSet } from '@dxos/react-ui-theme';

import { themeEditorId } from '../defs';

export type JsonEditorProps = {};

export const JsonEditor = (_: JsonEditorProps) => {
  const { themeMode } = useThemeContext();
  const initialValue = useMemo(
    () =>
      JSON.stringify(JSON.parse(localStorage.getItem(themeEditorId) ?? JSON.stringify(userDefaultTokenSet)), null, 2),
    [],
  );
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id: themeEditorId,
      initialValue,
      extensions: [
        createBasicExtensions({
          highlightActiveLine: true,
          indentWithTab: true,
          lineNumbers: true,
          lineWrapping: false,
          scrollPastEnd: true,
        }),
        createThemeExtensions({
          themeMode,
          syntaxHighlighting: true,
          slots: {
            content: { className: editorFullWidth },
          },
        }),
        folding(),
        // NOTE: Not using default editor gutter because folding for code works best right beside text.
        EditorView.theme({
          '.cm-gutters': {
            // Match margin from content.
            marginTop: '16px',
          },
        }),
        [editorMonospace, json()],
        EditorView.updateListener.of((update) => {
          let nextValue = null;
          try {
            nextValue = JSON.stringify(JSON.parse(update.state.doc.toString()));
          } catch (err) {
            log.warn('Invalid JSON', err);
          }
          if (nextValue) {
            localStorage.setItem(themeEditorId, nextValue);
          }
        }),
      ],
    }),
    [themeMode],
  );

  return <div ref={parentRef} data-toolbar='enabled' className='min-bs-0' {...focusAttributes} />;
};
