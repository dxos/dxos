//
// Copyright 2023 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type ScriptType } from '@dxos/functions';
import { createDocAccessor, DocAccessor } from '@dxos/react-client/echo';
import { Toolbar, Button, Icon } from '@dxos/react-ui';

import { Bundler, type BundlerResult, initializeBundler } from '../../bundler';
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

  // Url to the page used to host the script in the iframe.
  containerUrl: string;
};

/**
 * @deprecated
 */
// TODO(burdon): Cache compiled results in context.
export const ScriptBlock = ({ script, hideSelector, containerUrl }: ScriptBlockProps) => {
  const source = useMemo(() => script.source && createDocAccessor(script.source.target!, ['content']), [script.source]);
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
    <div className='flex flex-col grow overflow-hidden'>
      {!hideSelector && (
        <Toolbar.Root>
          <div className='grow' />
          {result?.bundle && !result?.error && (
            <div title={String(result.error)}>
              <Icon icon='ph--check--regular' size={5} classNames='text-green-500' />
            </div>
          )}
          {result?.error && (
            <div title={String(result.error)}>
              <Icon icon='ph--warning--regular' size={5} classNames='text-orange-500' />
            </div>
          )}
          <Button variant='ghost' onClick={() => handleExec()}>
            <Icon icon='ph--play--regular' size={5} />
          </Button>
        </Toolbar.Root>
      )}

      <div role='none' className='flex'>
        <div role='none' className='flex flex-col'>
          <ScriptEditor script={script} />
        </div>
        {result && <FrameContainer key={script.id} result={result} containerUrl={containerUrl} />}
      </div>
    </div>
  );
};
