//
// Copyright 2025 DXOS.org
//

import { json } from '@codemirror/lang-json';
import debounce from 'lodash.debounce';
import React, { useMemo } from 'react';

import { useThemeContext } from '@dxos/react-ui';
import {
  EditorView,
  createBasicExtensions,
  createThemeExtensions,
  folding,
  useTextEditor,
} from '@dxos/react-ui-editor';

import { themeEditorId } from '../defs';
import { restore, saveAndRender } from '../util';

export type JsonEditorProps = {};

const handleUpdate = debounce((update) => saveAndRender(update.state.doc.toString()), 400);

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
          monospace: true,
          syntaxHighlighting: true,
          themeMode,
        }),
        folding(),
        json(),
        EditorView.updateListener.of(handleUpdate),
      ],
    }),
    [themeMode],
  );

  return <div ref={parentRef} className='min-bs-0 border-bs border-separator' {...focusAttributes} />;
};
