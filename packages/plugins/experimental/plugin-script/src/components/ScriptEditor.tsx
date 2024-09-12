//
// Copyright 2023 DXOS.org
//

import { type DID } from 'iso-did/types';
import { format } from 'prettier';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginTypescript from 'prettier/plugins/typescript';
import React, { useCallback, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { create, createDocAccessor, Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { createDataExtensions, listener } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { Toolbar } from './Toolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';
import { Bundler } from '../bundler';
import {
  getUserFunctionUrlInMetadata,
  publicKeyToDid,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
} from '../edge';
import { SCRIPT_PLUGIN } from '../meta';
import { FunctionType, type ScriptType } from '../types';

export type ScriptEditorProps = {
  script: ScriptType;
  role?: string;
} & Pick<TypescriptEditorProps, 'env'>;

export const ScriptEditor = ({ env, script, role }: ScriptEditorProps) => {
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

  const handleFormat = useCallback(async () => {
    if (!script.source) {
      return;
    }

    try {
      const formatted = await format(script.source.content, {
        parser: 'typescript',
        plugins: [prettierPluginEstree, prettierPluginTypescript],
        semi: true,
        singleQuote: true,
      });
      script.source.content = formatted;
    } catch (err: any) {
      // TODO(wittjosiah): Show error in UI.
      log.catch(err);
    }
  }, [script.source]);

  const handleDeploy = useCallback(async () => {
    if (!script.source || !identity || !space) {
      return;
    }

    setError(undefined);

    try {
      const existingFunctionId = existingFunctionUrl?.split('/').at(-1);
      const ownerDid = (existingFunctionUrl?.split('/').at(-2) as DID) ?? publicKeyToDid(identity.identityKey);

      const bundler = new Bundler({
        platform: 'browser',
        sandboxedModules: [],
        remoteModules: {},
      });
      const buildResult = await bundler.bundle(script.source.content);
      if (buildResult.error || !buildResult.bundle) {
        throw buildResult.error;
      }

      const { result, functionId, functionVersionNumber, errorMessage } = await uploadWorkerFunction({
        clientConfig: client.config,
        halo: client.halo,
        ownerDid,
        functionId: existingFunctionId,
        source: buildResult.bundle,
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

  const functionUrl = useMemo(() => {
    if (!existingFunctionUrl) {
      return;
    }

    const url = new URL(existingFunctionUrl, client.config.values.runtime?.services?.edge?.url);
    space && url.searchParams.set('spaceId', space.id);
    url.protocol = 'https';
    return url.toString();
  }, [existingFunctionUrl, space]);

  return (
    <div
      role='none'
      className={mx(role === 'article' && 'row-span-2', 'flex flex-col is-full bs-full overflow-hidden')}
    >
      <Toolbar
        binding={fn?.binding ?? ''}
        onBindingChange={handleBindingChange}
        onFormat={handleFormat}
        deployed={Boolean(existingFunctionUrl) && !script.changed}
        onDeploy={handleDeploy}
        functionUrl={functionUrl}
        error={error}
      />
      <TypescriptEditor
        id={script.id}
        env={env}
        initialValue={initialValue}
        extensions={extensions}
        className='flex is-full bs-full overflow-hidden'
      />
    </div>
  );
};

export default ScriptEditor;
