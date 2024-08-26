//
// Copyright 2023 DXOS.org
//

import { Check, Cloud, Play, Warning } from '@phosphor-icons/react';
// @ts-ignore
import esbuildWasmURL from 'esbuild-wasm/esbuild.wasm?url';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getUserFunctionIdInMetadata,
  uploadWorkerFunction,
  setUserFunctionIdInMetadata,
  type UserFunctionUploadResult,
} from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { DocAccessor, type ObjectMeta } from '@dxos/react-client/echo';
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
  name?: string;
  echoObjectMeta: ObjectMeta;
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
  name,
  source,
  view: controlledView,
  hideSelector,
  classes,
  containerUrl,
  echoObjectMeta,
}: ScriptBlockProps) => {
  const { themeMode } = useThemeContext();
  const [view, setView] = useState<View>(controlledView ?? 'editor');
  useEffect(() => handleSetView(controlledView ?? 'editor'), [controlledView]);

  const [result, setResult] = useState<CompilerResult>();
  const [uploadResult, setUploadResult] = useState<string>();
  const client = useClient();
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

  const handleUpload = useCallback(async () => {
    const identity = client.halo.identity.get();
    invariant(identity, 'Identity not available');
    let result: UserFunctionUploadResult;

    const existingFunctionId = await getUserFunctionIdInMetadata(echoObjectMeta);
    try {
      result = await uploadWorkerFunction({
        clientConfig: client.config,
        halo: client.halo,
        owner: identity.identityKey,
        functionId: existingFunctionId,
        name,
        source: DocAccessor.getValue(source),
      });
    } catch (err: any) {
      log.error(err);
      setUploadResult(err);
      return;
    }
    if (result.result !== 'success' || result.functionId === undefined) {
      setUploadResult('Upload failed: ' + result.errorMessage);
      return;
    }
    await setUserFunctionIdInMetadata(echoObjectMeta, result.functionId);
    // TODO: UI feedback for success
    log.info('function uploaded', {
      functionId: result.functionId,
      functionVersionNumber: result.functionVersionNumber,
    });
  }, [id, name, source]);

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
            <Button onClick={() => handleUpload()}>
              <Cloud className={getSize(5)} />
            </Button>
            {uploadResult && <div>{uploadResult}</div>}
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
