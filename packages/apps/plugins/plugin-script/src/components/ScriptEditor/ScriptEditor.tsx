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
// @ts-ignore
import ThemeLight from './themes/GitHubLight.json?json';

export type ScriptEditorProps = {
  id: string;
  content: YText;
  language?: string;
  themeMode?: ThemeMode;
  className?: string;
  onBeforeMount?: (monaco: Monaco) => void;
};

/**
 * Monaco script editor.
 * https://www.npmjs.com/package/@monaco-editor
 * https://microsoft.github.io/monaco-editor/playground.html
 */
export const ScriptEditor = ({ id, content, language, themeMode, className, onBeforeMount }: ScriptEditorProps) => {
  // https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IStandaloneEditorConstructionOptions.html
  const options: IStandaloneEditorConstructionOptions = {
    cursorStyle: 'line-thin',
    fontSize: 14,
    language,
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
  useEffect(() => {
    // https://github.com/brijeshb42/monaco-themes/tree/master/themes
    monaco?.editor.defineTheme('light', ThemeLight);
    monaco?.editor.setTheme(themeMode === 'dark' ? 'vs-dark' : 'light');
  }, [monaco, themeMode]);

  // Connect editor model to YJS.
  const handleMount = (editor: IStandaloneCodeEditor, _: Monaco) => {
    if (content) {
      const _ = new MonacoBinding(content, editor.getModel()!, new Set([editor]));
    }
  };

  // https://www.npmjs.com/package/@monaco-editor/react#props
  return (
    <MonacoEditor
      key={id}
      className={mx('grow overflow-hidden', className)}
      theme={themeMode === 'dark' ? 'vs-dark' : 'light'}
      loading={<div />}
      options={options}
      language={language}
      path={`${id}.tsx`} // Required to support JSX.
      value={String(content)}
      beforeMount={onBeforeMount}
      onMount={handleMount}
    />
  );
};
