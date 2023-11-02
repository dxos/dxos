//
// Copyright 2023 DXOS.org
//

import MonacoEditor, { type Monaco, useMonaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import React, { useEffect } from 'react';
import { MonacoBinding } from 'y-monaco';

import { type ThemeMode } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type YText } from '@dxos/text-model';

import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

export type ScriptEditorProps = {
  content: YText;
  themeMode?: ThemeMode;
  className?: string;
};

/**
 * Monaco script editor.
 * https://www.npmjs.com/package/@monaco-editor
 */
export const ScriptEditor = ({ content, themeMode, className }: ScriptEditorProps) => {
  // https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IStandaloneEditorConstructionOptions.html
  const options: IStandaloneEditorConstructionOptions = {
    cursorStyle: 'line-thin',
    fontSize: 14,
    language: 'typescript',
    minimap: {
      enabled: false,
    },
    readOnly: false,
    renderLineHighlight: 'none',
    scrollbar: {
      horizontalScrollbarSize: 4,
      verticalScrollbarSize: 4,
      useShadows: false,
    },
    tabSize: 2,
  };

  // https://www.npmjs.com/package/@monaco-editor/react#monaco-instance
  const monaco = useMonaco();
  useEffect(() => {}, [monaco]);

  const handleWillMount = (monaco: Monaco) => {
    // TODO(burdon): Module resolution.
    // TODO(burdon): https://github.com/lukasbach/monaco-editor-auto-typings
    // monaco.languages.typescript.typescriptDefaults.addExtraLib(content, '');

    // TODO(burdon): Temporarily disable diagnostics (to hide import errors).
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });

    // https://microsoft.github.io/monaco-editor/typedoc/interfaces/languages.typescript.CompilerOptions.html
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      // module: monaco.languages.typescript.ModuleKind.CommonJS,
      // moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      // noEmit: true,
      // target: monaco.languages.typescript.ScriptTarget.ESNext,
      // typeRoots: ['node_modules/@types'],
      jsx: monaco.languages.typescript.JsxEmit.React,
    });
  };

  const handleMount = (editor: IStandaloneCodeEditor, monaco: Monaco) => {
    if (content) {
      // Connect editor model to YJS.
      const models = monaco.editor.getModels();
      const _ = new MonacoBinding(content, models[0], new Set([editor]));
    }
  };

  return (
    <div className={mx('grow overflow-hidden', className)}>
      {/* https://www.npmjs.com/package/@monaco-editor/react#props */}
      <MonacoEditor
        theme={themeMode === 'dark' ? 'vs-dark' : 'light'}
        language='typescript'
        loading={<div />}
        options={options}
        path='main.tsx' // Required to support JSX.
        beforeMount={handleWillMount}
        onMount={handleMount}
      />
    </div>
  );
};
