//
// Copyright 2023 DXOS.org
//

import { type DID } from 'iso-did/types';
import React, { useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { create, createDocAccessor, Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { createDataExtensions, listener } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import {
  getUserFunctionUrlInMetadata,
  publicKeyToDid,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
} from '../edge';
import { SCRIPT_PLUGIN } from '../meta';
import { FunctionType, type ScriptType } from '../types';
import { Toolbar } from './Toolbar';
import { TypescriptEditor } from './TypescriptEditor';

export type ScriptEditorProps = {
  script: ScriptType;
  role?: string;
};

export const ScriptEditor = ({ script, role }: ScriptEditorProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const space = getSpace(script);
  const [fn] = useQuery(
    space,
    Filter.schema(FunctionType, (fn) => fn.source === script),
  );
  const extensions = useMemo(
    () => [
      listener({
        onChange: (text) => {
          if (script.source && script.source?.content !== text) {
            script.changed = true;
          }
        },
      }),
      createDataExtensions({
        id: script.id,
        text: script.source && createDocAccessor(script.source, ['content']),
        space,
        identity,
      }),
    ],
    [script, script.source, space, identity],
  );
  const initialValue = useMemo(() => script.source?.content, [script.source]);
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  const [error, setError] = useState<string>();

  const handleBindingChange = useCallback(
    (binding: string) => {
      fn.binding = binding;
    },
    [fn],
  );

  const handleDeploy = useCallback(async () => {
    if (!script.source || !identity || !space) {
      return;
    }

    setError(undefined);

    try {
      const existingFunctionId = existingFunctionUrl?.split('/').at(-1);
      const ownerDid = (existingFunctionUrl?.split('/').at(-2) as DID) ?? publicKeyToDid(identity.identityKey);

      // const sourceCode = script.source.content;

      // await initializeCompiler({ wasmURL: wasmModule });

      // const compiler = new Compiler({
      //   platform: 'browser',
      //   sandboxedModules: [],
      //   remoteModules: {},
      // });

      // const buildResult = await compiler.compile(sourceCode);

      // console.log('buildResult', buildResult);

      const { result, functionId, functionVersionNumber, errorMessage } = await uploadWorkerFunction({
        clientConfig: client.config,
        halo: client.halo,
        ownerDid,
        functionId: existingFunctionId,
        source: script.source.content,
      });
      if (result !== 'success' || functionId === undefined || functionVersionNumber === undefined) {
        throw new Error(errorMessage);
      }
      log.info('function uploaded', { functionId, functionVersionNumber });
      if (fn) {
        fn.version = functionVersionNumber;
      }
      const deployedFunction =
        fn ?? space.db.add(create(FunctionType, { version: functionVersionNumber, source: script }));
      const meta = getMeta(deployedFunction);
      setUserFunctionUrlInMetadata(meta, `/${ownerDid}/${functionId}`);
      script.changed = false;
    } catch (err: any) {
      log.catch(err);
      setError(t('upload failed label'));
    }
  }, [fn, existingFunctionUrl, script, script.name, script.source]);

  return (
    <div
      role='none'
      className={mx(role === 'article' && 'row-span-2', 'flex flex-col is-full bs-full overflow-hidden')}
    >
      <Toolbar
        binding={fn?.binding ?? ''}
        onBindingChange={handleBindingChange}
        deployed={Boolean(existingFunctionUrl) && !script.changed}
        onDeploy={handleDeploy}
        functionUrl={existingFunctionUrl}
        error={error}
      />
      <TypescriptEditor
        id={script.id}
        initialValue={initialValue}
        extensions={extensions}
        className='flex is-full bs-full overflow-hidden'
      />
    </div>
  );
};

export default ScriptEditor;
