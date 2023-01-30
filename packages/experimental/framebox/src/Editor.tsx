//
// Copyright 2023 DXOS.org
//

import MonacoEditor from '@monaco-editor/react';
import React, { useRef } from 'react';
import { MonacoBinding } from 'y-monaco';

import { TextObject } from '@dxos/echo-schema';

export type EditorProps = {
  document: TextObject;
  onChange?: () => void;
};

export const Editor = ({ document, onChange }: EditorProps) => {
  const monacoRef = useRef(null);

  const handleEditorWillMount = (monaco: any) => {
    // https://microsoft.github.io/monaco-editor/api/modules/monaco.languages.typescript.html
    // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.typescript.CompilerOptions.html
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: 'react',
      noLib: true
      // TODO(burdon): Error.
      // https://github.com/microsoft/monaco-editor/issues/2249
      // allowNonTsExtensions: true
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Get instance.
    const _ = new MonacoBinding(document.doc!.getText('monaco'), editor.getModel(), new Set([editor]));
    monacoRef.current = editor;
  };

  // https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.IDiffEditorConstructionOptions.html
  // prettier-ignore
  const options = {
    readOnly: false,
    minimap: {
      enabled: false
    },
    // https://github.com/microsoft/monaco-editor/blob/212670ceb460441b3ebed29e6ca30aa1e9bdde85/website/typedoc/monaco.d.ts#L4035
    scrollbar: {
      useShadows: false,
      verticalScrollbarSize: 4,
      horizontalScrollbarSize: 4
    }
  };

  // https://www.npmjs.com/package/@monaco-editor/react#monaco-instance
  // https://www.npmjs.com/package/@monaco-editor/react#props
  // TODO(burdon): Throws the following error:
  //  Uncaught (in promise) Error: Could not find source file: 'inmemory://model/1'.
  //  https://github.com/microsoft/monaco-editor/issues/2249
  return (
    <MonacoEditor
      defaultLanguage='typescript'
      defaultValue='// (c) 2023, DXOS.org'
      beforeMount={handleEditorWillMount}
      options={options}
      onMount={handleEditorDidMount}
      onChange={onChange}
    />
  );
};
