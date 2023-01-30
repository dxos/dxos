//
// Copyright 2023 DXOS.org
//

import MonacoEditor from '@monaco-editor/react';
import React, { useRef } from 'react';
import { MonacoBinding } from 'y-monaco';

import { TextObject } from '@dxos/echo-schema';

export type EditorProps = {
  document: TextObject;
};

export const Editor = ({ document }: EditorProps) => {
  const monacoRef = useRef(null);

  const handleEditorWillMount = (monaco: any) => {
    // here is the monaco instance
    // do something before editor is mounted
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: 'react'
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // here is another way to get monaco instance
    // you can also store it in `useRef` for further usage
    const _ = new MonacoBinding(document.doc!.getText('monaco'), editor.getModel(), new Set([editor]));
    monacoRef.current = editor;
  };

  return (
    <MonacoEditor
      height='90vh'
      width='50vw'
      defaultLanguage='typescript'
      defaultValue='// some comment'
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
      options={{ readOnly: false, minimap: { enabled: false } }}
    />
  );
};
