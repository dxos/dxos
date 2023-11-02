//
// Copyright 2023 DXOS.org
//

import MonacoEditor, { type Monaco, useMonaco } from '@monaco-editor/react';
import { Code, Play } from '@phosphor-icons/react';
import { editor, languages } from 'monaco-editor';
import React, { useEffect } from 'react';
import { MonacoBinding } from 'y-monaco';

import { type TextObject } from '@dxos/client/echo';
import { Button, DensityProvider, Toolbar } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { type YText } from '@dxos/text-model';

import JsxEmit = languages.typescript.JsxEmit;
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
import IStandaloneEditorConstructionOptions = editor.IStandaloneEditorConstructionOptions;

export type ScriptEditorProps = {
  content: TextObject;
  className?: string;
  onExec?: (source: string) => void;
};

/**
 * Monaco script editor.
 * https://www.npmjs.com/package/@monaco-editor
 */
export const ScriptEditor = ({ content, className, onExec }: ScriptEditorProps) => {
  // https://www.npmjs.com/package/@monaco-editor/react#monaco-instance
  const monaco = useMonaco();
  useEffect(() => {
    if (monaco) {
      // console.log('initialized', { monaco });
    }
  }, [monaco]);

  // https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IStandaloneEditorConstructionOptions.html
  const options: IStandaloneEditorConstructionOptions = {
    cursorStyle: 'line-thin',
    fontSize: 14,
    minimap: {
      enabled: false,
    },
    readOnly: false,
    renderLineHighlight: 'none',
    scrollbar: {
      useShadows: false,
      verticalScrollbarSize: 4,
      horizontalScrollbarSize: 4,
    },
  };

  const handleWillMount = (monaco: Monaco) => {
    // https://microsoft.github.io/monaco-editor/typedoc/interfaces/languages.typescript.CompilerOptions.html
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      // allowJs: true,
      allowNonTsExtensions: true, // Allow in-memory file.
      jsx: JsxEmit.ReactJSX,
      lib: ['DOM', 'ESNext'],
    });
  };

  const handleMount = (editor: IStandaloneCodeEditor, monaco: Monaco) => {
    if (content) {
      // Connect editor model to YJS.
      const models = monaco.editor.getModels();
      const _ = new MonacoBinding(content.content as YText, models[0], new Set([editor]));
    }
  };

  return (
    <div className={mx('flex flex-col grow divide-y', className)}>
      <DensityProvider density='fine'>
        <Toolbar.Root>
          <Button variant={'ghost'}>
            <Code className={getSize(6)} />
          </Button>
          <div className={'grow'} />
          <Button variant={'ghost'} onClick={() => onExec?.(content.text)}>
            <Play className={getSize(4)} />
          </Button>
        </Toolbar.Root>
      </DensityProvider>
      <div className='flex grow overflow-hidden'>
        {/* https://www.npmjs.com/package/@monaco-editor/react#props */}
        <MonacoEditor
          theme={'light'}
          language={'typescript'}
          loading={<div />}
          options={options}
          beforeMount={handleWillMount}
          onMount={handleMount}
        />
      </div>
    </div>
  );
};
