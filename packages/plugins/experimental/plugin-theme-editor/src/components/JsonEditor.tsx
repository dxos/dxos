//
// Copyright 2025 DXOS.org
//

import { json } from '@codemirror/lang-json';
import debounce from 'lodash.debounce';
import React, { useMemo } from 'react';

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

import { themeEditorId } from '../defs';
import { restore, save } from '../util';

export type JsonEditorProps = {};

const handleUpdate = debounce((update) => save(update.state.doc.toString()), 500);

export const JsonEditor = (_: JsonEditorProps) => {
  const { themeMode } = useThemeContext();
  const initialValue = useMemo(() => restore(), []);
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
        EditorView.updateListener.of(handleUpdate),
      ],
    }),
    [themeMode],
  );

  return (
    <div ref={parentRef} data-toolbar='enabled' className='min-bs-0 border-bs border-separator' {...focusAttributes} />
  );
};
