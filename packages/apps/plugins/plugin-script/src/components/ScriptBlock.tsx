//
// Copyright 2023 DXOS.org
//

import type { Monaco } from '@monaco-editor/react';
import { Play } from '@phosphor-icons/react';
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { DensityProvider, useThemeContext, Toolbar, Button } from '@dxos/react-ui';
import { mx, getSize } from '@dxos/react-ui-theme';
import { type YText } from '@dxos/text-model';

import { FrameContainer } from './FrameContainer';
import { ScriptEditor } from './ScriptEditor';
import { Splitter, SplitterSelector, type View } from './Splitter';
import { Compiler, type CompilerResult, initializeCompiler } from '../compiler';

export type ScriptBlockProps = {
  id: string;
  source: TextObject;
  view?: View;
  hideSelector?: boolean;
  classes?: {
    root?: string;
    toolbar?: string;
  };

  // Url to the page used to host the script in the iframe.
  containerUrl: string;
};

// TODO(burdon): Cache compiled results in context.
export const ScriptBlock = ({
  id,
  source,
  view: controlledView,
  hideSelector,
  classes,
  containerUrl,
}: ScriptBlockProps) => {
  const { themeMode } = useThemeContext();
  const [view, setView] = useState<View>(controlledView ?? 'editor');
  useEffect(() => handleSetView(controlledView ?? 'editor'), [controlledView]);

  const [result, setResult] = useState<CompilerResult>();
  const compiler = useMemo(() => new Compiler({ platform: 'browser' }), []);
  useEffect(() => {
    // TODO(burdon): Create useCompiler hook (with initialization).
    void initializeCompiler({ wasmURL: esbuildWasmURL });
  }, []);

  useEffect(() => {
    setTimeout(async () => {
      const result = await compiler.compile(String(source.content));
      setResult(result);
    });
  }, [source, id]);

  const handleSetView = useCallback(
    (view: View) => {
      setView(view);
      if (!result && view !== 'editor') {
        void handleExec(false);
      }
    },
    [result],
  );

  const handleExec = useCallback(
    async (auto = true) => {
      const result = await compiler.compile(String(source.content));
      setResult(result);
      if (auto && view === 'editor') {
        setView('preview');
      }
    },
    [source, view],
  );

  const handleBeforeMount = (monaco: Monaco) => {
    // TODO(burdon): Module resolution: https://github.com/lukasbach/monaco-editor-auto-typings
    //  https://stackoverflow.com/questions/52290727/adding-typescript-type-declarations-to-monaco-editor
    //  https://stackoverflow.com/questions/43058191/how-to-use-addextralib-in-monaco-with-an-external-type-definition
    //  Temporarily disable diagnostics (to hide import errors).
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
    });

    // https://microsoft.github.io/monaco-editor/typedoc/interfaces/languages.typescript.CompilerOptions.html
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      // module: monaco.languages.typescript.ModuleKind.CommonJS,
      // moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      // noEmit: true,
      // noLib: true,
      // target: monaco.languages.typescript.ScriptTarget.ESNext,
      // typeRoots: ['node_modules/@types'],
      jsx: monaco.languages.typescript.JsxEmit.React,
    });
  };

  if (!source) {
    return null;
  }

  return (
    <div className={mx('flex flex-col grow overflow-hidden', classes?.root)}>
      {!hideSelector && (
        <DensityProvider density={'fine'}>
          <Toolbar.Root classNames={mx('mb-2', classes?.toolbar)}>
            <SplitterSelector view={view} onChange={handleSetView} />
            <div className='grow' />
            <Button variant='ghost' onClick={() => handleExec()}>
              <Play className={getSize(5)} />
            </Button>
          </Toolbar.Root>
        </DensityProvider>
      )}

      <Splitter view={view}>
        <ScriptEditor
          id={id}
          content={source.content as YText}
          themeMode={themeMode}
          language='typescript'
          onBeforeMount={handleBeforeMount}
        />
        {result && <FrameContainer key={id} result={result} containerUrl={containerUrl} />}
      </Splitter>
    </div>
  );
};
