//
// Copyright 2023 DXOS.org
//

import { Code, Play, SquareSplitHorizontal, Eye } from '@phosphor-icons/react';
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { Main, Button, DensityProvider, ToggleGroup, ToggleGroupItem, Toolbar, useThemeContext } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout, getSize, mx } from '@dxos/react-ui-theme';
import { type YText } from '@dxos/text-model';

import { FrameContainer } from './FrameContainer';
import { ScriptEditor } from './ScriptEditor';
import { Compiler, type CompilerResult, initializeCompiler } from '../compiler';

export type View = 'editor' | 'preview' | 'split' | 'preview-only';

export type ScriptMainProps = {
  id: string;
  view?: View;
  source: TextObject;
  className?: string;

  // Url to the page used to host the script in the iframe.
  containerUrl: string;
};

export const ScriptMain = (props: ScriptMainProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <ScriptSection {...props} />
    </Main.Content>
  );
};

// TODO(burdon): Cache result in context.
export const ScriptSection = ({ id, view: controlledView, source, containerUrl, className }: ScriptMainProps) => {
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

  const { themeMode } = useThemeContext();
  const [view, setView] = useState<View>(controlledView ?? 'editor');
  useEffect(() => {
    handleSetView(controlledView ?? 'editor');
  }, [controlledView]);

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

  if (!source) {
    return null;
  }

  return (
    <div className={mx('flex flex-col grow overflow-hidden', className)}>
      {view !== 'preview-only' && (
        <DensityProvider density={'fine'}>
          <Toolbar.Root classNames='p-2'>
            <ToggleGroup type='single' value={view} onValueChange={(value) => handleSetView(value as View)}>
              <ToggleGroupItem value='editor'>
                <Code className={getSize(5)} />
              </ToggleGroupItem>
              <ToggleGroupItem value='split'>
                <SquareSplitHorizontal className={getSize(5)} />
              </ToggleGroupItem>
              <ToggleGroupItem value='preview'>
                <Eye className={getSize(5)} />
              </ToggleGroupItem>
            </ToggleGroup>
            <div className='grow' />
            <Button variant={'ghost'} onClick={() => handleExec()}>
              <Play className={getSize(5)} />
            </Button>
          </Toolbar.Root>
        </DensityProvider>
      )}

      <div className='flex overflow-hidden grow'>
        {view !== 'preview' && view !== 'preview-only' && (
          <div className={mx('flex flex-1 shrink-0 overflow-x-auto')}>
            <ScriptEditor id={id} content={source.content as YText} themeMode={themeMode} />
          </div>
        )}
        {view !== 'editor' && result && (
          <div className='flex flex-1 shrink-0 overflow-hidden'>
            <FrameContainer key={id} result={result} containerUrl={containerUrl} />
          </div>
        )}
      </div>
    </div>
  );
};
