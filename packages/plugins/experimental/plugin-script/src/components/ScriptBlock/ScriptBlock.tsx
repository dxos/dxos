//
// Copyright 2023 DXOS.org
//

import { Check, Play, Warning } from '@phosphor-icons/react';
// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { createDocAccessor, DocAccessor } from '@dxos/react-client/echo';
import { DensityProvider, Toolbar, Button } from '@dxos/react-ui';
import { mx, getSize } from '@dxos/react-ui-theme';

import { Bundler, type BundlerResult, initializeBundler } from '../../bundler';
import { type ScriptType } from '../../types';
import { FrameContainer } from '../FrameContainer';
import { ScriptEditor } from '../ScriptEditor';

// Keep in sync with packages/apps/composer-app/script-frame/main.tsx .
const PROVIDED_MODULES = [
  'react',
  'react-dom/client',
  '@dxos/client',
  '@dxos/react-client',
  '@dxos/react-client/echo',
  '@dxos/plugin-explorer',
];

export type ScriptBlockProps = {
  script: ScriptType;
  hideSelector?: boolean;
  classes?: {
    root?: string;
    toolbar?: string;
  };

  // Url to the page used to host the script in the iframe.
  containerUrl: string;
};

/**
 * @deprecated
 */
// TODO(burdon): Cache compiled results in context.
export const ScriptBlock = ({ script, hideSelector, classes, containerUrl }: ScriptBlockProps) => {
  const source = useMemo(() => script.source && createDocAccessor(script.source, ['content']), [script.source]);
  const [result, setResult] = useState<BundlerResult>();
  const bundler = useMemo(
    () => new Bundler({ platform: 'browser', sandboxedModules: PROVIDED_MODULES, remoteModules: {} }),
    [],
  );
  useEffect(() => {
    // TODO(burdon): Create useCompiler hook (with initialization).
    void initializeBundler({ wasmUrl });
  }, []);
  useEffect(() => {
    // TODO(burdon): Throttle and listen for update.
    const t = setTimeout(async () => {
      if (!source) {
        return;
      }

      const result = await bundler.bundle(DocAccessor.getValue(source));
      setResult(result);
    });

    return () => clearTimeout(t);
  }, [source]);

  const handleExec = useCallback(
    async (auto = true) => {
      if (!source) {
        return;
      }
      const result = await bundler.bundle(DocAccessor.getValue(source));
      setResult(result);
    },
    [source],
  );

  return (
    <div className={mx('flex flex-col grow overflow-hidden', classes?.root)}>
      {!hideSelector && (
        <DensityProvider density='fine'>
          <Toolbar.Root classNames={mx('mb-2', classes?.toolbar)}>
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

      <div className='flex'>
        <ScriptEditor script={script} />
        {result && <FrameContainer key={script.id} result={result} containerUrl={containerUrl} />}
      </div>
    </div>
  );
};
