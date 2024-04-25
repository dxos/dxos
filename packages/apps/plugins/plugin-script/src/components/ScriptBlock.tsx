//
// Copyright 2023 DXOS.org
//

import { Check, Play, Warning } from '@phosphor-icons/react';
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DocAccessor } from '@dxos/react-client/echo';
import { DensityProvider, useThemeContext, Toolbar, Button } from '@dxos/react-ui';
import { mx, getSize } from '@dxos/react-ui-theme';

import { FrameContainer } from './FrameContainer';
import { ScriptEditor } from './ScriptEditor';
import { Splitter, SplitterSelector, type View } from './Splitter';
import { Compiler, type CompilerResult, initializeCompiler } from '../compiler';

// Keep in sync with packages/apps/composer-app/script-frame/main.tsx .
const PROVIDED_MODULES = [
  'react',
  'react-dom/client',
  '@dxos/client',
  '@dxos/react-client',
  '@dxos/react-client/echo',
  '@braneframe/plugin-explorer',
  '@braneframe/types',
];

export type ScriptBlockProps = {
  id: string;
  source: DocAccessor;
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
  const compiler = useMemo(() => new Compiler({ platform: 'browser', providedModules: PROVIDED_MODULES }), []);
  useEffect(() => {
    // TODO(burdon): Create useCompiler hook (with initialization).
    void initializeCompiler({ wasmURL: esbuildWasmURL });
  }, []);

  useEffect(() => {
    // TODO(burdon): Throttle and listen for update.
    const t = setTimeout(async () => {
      const result = await compiler.compile(DocAccessor.getValue(source));
      setResult(result);
    });

    return () => clearTimeout(t);
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
      const result = await compiler.compile(DocAccessor.getValue(source));
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
    <div className={mx('flex flex-col grow overflow-hidden', classes?.root)}>
      {!hideSelector && (
        <DensityProvider density='fine'>
          <Toolbar.Root classNames={mx('mb-2', classes?.toolbar)}>
            <SplitterSelector view={view} onChange={handleSetView} />
            <div className='grow' />
            {result?.bundle && !result?.error && (
              <div title={String(result.error)}>
                <Check className={mx(getSize(5), 'text-green-500')} />
              </div>
            )}
            {result?.error && (
              <div title={String(result.error)}>
                <Warning className={mx(getSize(5), 'text-orange-500')} />
              </div>
            )}
            <Button variant='ghost' onClick={() => handleExec()}>
              <Play className={getSize(5)} />
            </Button>
          </Toolbar.Root>
        </DensityProvider>
      )}

      <Splitter view={view}>
        <ScriptEditor source={source} themeMode={themeMode} />
        {result && <FrameContainer key={id} result={result} containerUrl={containerUrl} />}
      </Splitter>
    </div>
  );
};
