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
import { useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { createDataExtensions, listener } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { DebugPanel } from './DebugPanel';
import { type TemplateSelectProps, Toolbar, type ViewType } from './Toolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';
import { Bundler } from '../bundler';
import {
  getInvocationUrl,
  getUserFunctionUrlInMetadata,
  publicKeyToDid,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
  FUNCTIONS_PRESET_META_KEY,
  incrementSemverPatch,
} from '../edge';
import { SCRIPT_PLUGIN } from '../meta';
import { templates } from '../templates';
import { FunctionType, type ScriptType } from '../types';

export type ScriptEditorProps = ThemedClassName<{
  script: ScriptType;
}> &
  Pick<TypescriptEditorProps, 'env'>;

export const ScriptEditor = ({ classNames, script, env }: ScriptEditorProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const space = getSpace(script);
  // TODO(dmaretskyi): Parametric query.
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

  const [view, setView] = useState<ViewType>('editor');
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  const [error, setError] = useState<string>();

  const handleFormat = useCallback(async () => {
    if (!script.source) {
      return;
    }

    try {
      script.source.content = await format(script.source.content, {
        parser: 'typescript',
        plugins: [prettierPluginEstree, prettierPluginTypescript],
        semi: true,
        singleQuote: true,
      });
    } catch (err: any) {
      // TODO(wittjosiah): Show error in UI.
      log.catch(err);
    }
  }, [script.source]);

  const handleTemplateChange: TemplateSelectProps['onTemplateSelect'] = (id) => {
    const template = templates.find((template) => template.id === id);
    if (template) {
      script.name = template.name;
      script.source!.content = template.source;
      const metaKeys = getMeta(script).keys;
      const oldPresetIndex = metaKeys.findIndex((key) => key.source === FUNCTIONS_PRESET_META_KEY);
      if (oldPresetIndex >= 0) {
        metaKeys.splice(oldPresetIndex, 1);
      }
      if (template.presetId) {
        metaKeys.push({ source: FUNCTIONS_PRESET_META_KEY, id: template.presetId });
      }
    }
  };

  const handleDeploy = useCallback(async () => {
    if (!script.source || !identity || !space) {
      return;
    }

    setError(undefined);

    try {
      const existingFunctionId = existingFunctionUrl?.split('/').at(-1);
      const ownerDid = (existingFunctionUrl?.split('/').at(-2) as DID) ?? publicKeyToDid(identity.identityKey);

      const bundler = new Bundler({ platform: 'browser', sandboxedModules: [], remoteModules: {} });
      const buildResult = await bundler.bundle(script.source.content);
      if (buildResult.error || !buildResult.bundle) {
        throw buildResult.error;
      }

      const { functionId, version, meta } = await uploadWorkerFunction({
        client,
        ownerDid,
        version: fn ? incrementSemverPatch(fn.version) : '0.0.1',
        functionId: existingFunctionId,
        source: buildResult.bundle,
      });
      if (functionId === undefined || version === undefined) {
        throw new Error(`Upload didn't return expected data: functionId=${functionId}, version=${version}`);
      }

      log.info('function uploaded', { functionId, version });
      if (fn) {
        fn.version = version;
      }

      const deployedFunction = fn ?? space.db.add(create(FunctionType, { name: functionId, version, source: script }));

      script.changed = false;

      if (meta.inputSchema) {
        deployedFunction.inputSchema = meta.inputSchema;
      } else {
        log.verbose('no input schema in function metadata', { functionId });
      }

      setUserFunctionUrlInMetadata(getMeta(deployedFunction), `/${ownerDid}/${functionId}`);

      setView('split');
    } catch (err: any) {
      log.catch(err);
      setError(t('upload failed label'));
    }
  }, [fn, existingFunctionUrl, script, script.name, script.source]);

  const functionUrl = useMemo(() => {
    if (!existingFunctionUrl) {
      return;
    }

    return getInvocationUrl(existingFunctionUrl, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
    });
  }, [existingFunctionUrl, space]);

  return (
    <div role='none' className={mx('flex flex-col w-full overflow-hidden divide-y divide-separator', classNames)}>
      <Toolbar
        deployed={Boolean(existingFunctionUrl) && !script.changed}
        functionUrl={functionUrl}
        error={error}
        view={view}
        templates={templates}
        onDeploy={handleDeploy}
        onFormat={handleFormat}
        onViewChange={setView}
        onTemplateSelect={handleTemplateChange}
      />

      {view !== 'preview' && (
        <TypescriptEditor
          id={script.id}
          env={env}
          initialValue={script.source?.content}
          extensions={extensions}
          className='flex is-full bs-full overflow-hidden ch-focus-ring-inset-over-all'
        />
      )}

      {view !== 'editor' && <DebugPanel functionUrl={functionUrl} />}
    </div>
  );
};
