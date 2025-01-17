//
// Copyright 2023 DXOS.org
//

import { format } from 'prettier';
import prettierPluginEstree from 'prettier/plugins/estree';
import prettierPluginTypescript from 'prettier/plugins/typescript';
import React, { useCallback, useMemo, useState } from 'react';

import {
  FUNCTIONS_PRESET_META_KEY,
  FunctionType,
  type ScriptType,
  getInvocationUrl,
  getUserFunctionUrlInMetadata,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
  incrementSemverPatch,
} from '@dxos/functions';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { create, createDocAccessor, Filter, getMeta, getSpace, makeRef, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useTranslation, type ThemedClassName } from '@dxos/react-ui';
import {
  createDataExtensions,
  listener,
  stackItemContentEditorClassNames,
  stackItemContentToolbarClassNames,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { DebugPanel } from './DebugPanel';
import { type TemplateSelectProps, Toolbar, type ViewType } from './Toolbar';
import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';
import { Bundler } from '../bundler';
import { SCRIPT_PLUGIN } from '../meta';
import { templates } from '../templates';

export type ScriptEditorProps = ThemedClassName<{
  script: ScriptType;
  role?: string;
}> &
  Pick<TypescriptEditorProps, 'env'>;

export const ScriptEditor = ({ role, classNames, script, env }: ScriptEditorProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
  const identity = useIdentity();
  const space = getSpace(script);
  const [fn] = useQuery(space, Filter.schema(FunctionType, { source: script }));

  const extensions = useMemo(
    () => [
      listener({
        onChange: (text) => {
          if (script.source.target && script.source.target.content !== text) {
            script.changed = true;
          }
        },
      }),
      createDataExtensions({
        id: script.id,
        text: script.source.target && createDocAccessor(script.source.target, ['content']),
        space,
        identity,
      }),
    ],
    [script, script.source.target, space, identity],
  );

  const [view, setView] = useState<ViewType>('editor');
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  const [error, setError] = useState<string>();

  const handleFormat = useCallback(async () => {
    if (!script.source) {
      return;
    }

    try {
      script.source.target!.content = await format(script.source.target!.content, {
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
      script.source!.target!.content = template.source;
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

      const bundler = new Bundler({ platform: 'browser', sandboxedModules: [], remoteModules: {} });
      const buildResult = await bundler.bundle(script.source.target!.content);
      if (buildResult.error || !buildResult.bundle) {
        throw buildResult.error;
      }

      const { functionId, version, meta } = await uploadWorkerFunction({
        client,
        spaceId: space.id,
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

      const deployedFunction =
        fn ?? space.db.add(create(FunctionType, { name: functionId, version, source: makeRef(script) }));

      script.changed = false;

      if (meta.inputSchema) {
        deployedFunction.inputSchema = meta.inputSchema;
      } else {
        log.verbose('no input schema in function metadata', { functionId });
      }

      setUserFunctionUrlInMetadata(getMeta(deployedFunction), `/${space.id}/${functionId}`);

      setView('split');
    } catch (err: any) {
      log.catch(err);
      setError(t('upload failed label'));
    }
  }, [fn, existingFunctionUrl, script, script.name, script.source, space?.id ?? null]);

  const functionUrl = useMemo(() => {
    if (!existingFunctionUrl) {
      return;
    }

    return getInvocationUrl(existingFunctionUrl, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
    });
  }, [existingFunctionUrl, space]);

  return (
    <>
      <div role='none' className={stackItemContentToolbarClassNames(role)}>
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
      </div>
      <div role='none' className={mx('flex flex-col w-full overflow-hidden divide-y divide-separator', classNames)}>
        {view !== 'debug' && (
          <TypescriptEditor
            id={script.id}
            env={env}
            initialValue={script.source?.target?.content}
            extensions={extensions}
            className={stackItemContentEditorClassNames(role)}
            toolbar
          />
        )}

        {view !== 'editor' && <DebugPanel functionUrl={functionUrl} />}
      </div>
    </>
  );
};
