//
// Copyright 2023 DXOS.org
//

import { Code, Play, SquareSplitHorizontal, Eye } from '@phosphor-icons/react';
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useEffect, useMemo, useState } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { Main, Button, DensityProvider, ToggleGroup, ToggleGroupItem, Toolbar, useThemeContext } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout, getSize, mx } from '@dxos/react-ui-theme';
import { type YText } from '@dxos/text-model';

import { FrameContainer } from './FrameContainer';
import { ScriptEditor } from './ScriptEditor';
import { Compiler, type CompilerResult, initializeCompiler } from '../compiler';

export type View = 'editor' | 'preview' | 'split' | 'preview-only';

export type ScriptMainProps = {
  view?: View;
  source: TextObject;
  mainUrl: string;
  className?: string;
};

export const ScriptMain = (props: ScriptMainProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <ScriptSection {...props} />
    </Main.Content>
  );
};

export const ScriptSection = ({ view: controlledView, source, mainUrl, className }: ScriptMainProps) => {
  const [result, setResult] = useState<CompilerResult>();

  const { themeMode } = useThemeContext();
  const [view, setView] = useState<View>(controlledView ?? 'editor');
  useEffect(() => {
    setView(controlledView ?? 'editor');
    if (!result && (controlledView === 'preview' || controlledView === 'preview-only')) {
      void handleExec();
    }
  }, [controlledView]);

  const compiler = useMemo(() => new Compiler({ platform: 'browser' }), []);
  useEffect(() => {
    // TODO(burdon): Create useCompiler hook (with initialization).
    void initializeCompiler({ wasmURL: esbuildWasmURL });
  }, []);

  const handleExec = async () => {
    const result = await compiler.compile(String(source.content));
    setResult(result);
    if (view === 'editor') {
      setView('preview');
    }
  };

  if (!source) {
    return null;
  }

  return (
    <div className={mx('flex flex-col grow overflow-hidden', className)}>
      {view !== 'preview-only' && (
        <DensityProvider density={'fine'}>
          <Toolbar.Root classNames='p-2'>
            <ToggleGroup type='single' value={view} onValueChange={(value) => setView(value as any)}>
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
            <Button variant={'ghost'} onClick={handleExec}>
              <Play className={getSize(5)} />
            </Button>
          </Toolbar.Root>
        </DensityProvider>
      )}
      <div className='flex overflow-hidden grow'>
        {view !== 'preview' && view !== 'preview-only' && (
          <div className={mx('flex flex-1 shrink-0 overflow-x-auto')}>
            <ScriptEditor content={source.content as YText} themeMode={themeMode} />
          </div>
        )}
        {view !== 'editor' && result && (
          <div className='flex flex-1 shrink-0 overflow-hidden'>
            <FrameContainer result={result} mainUrl={mainUrl} />
          </div>
        )}
      </div>
    </div>
  );
};
