//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import {
  FunctionType,
  type ScriptType,
  getInvocationUrl,
  getUserFunctionUrlInMetadata,
  incrementSemverPatch,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
} from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Filter, create, getMeta, getSpace, makeRef, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';

import { type ViewState } from './view';
import { SCRIPT_PLUGIN } from '../meta';

export type DeployActionProperties = { type: 'deploy' } | { type: 'copy' };

export type DeployState = ViewState & {
  deploying: boolean;
  deployed: boolean;
  functionUrl: string;
  error: string;
};

export const createDeploy = (state: Partial<DeployState>) => {
  const errorItem = createMenuAction('error', {
    label: state.error ?? ['no error label', { ns: SCRIPT_PLUGIN }],
    icon: 'ph--warning-circle--regular',
    hidden: !state.error,
  });

  const deployAction = createMenuAction<DeployActionProperties>('deploy', {
    type: 'deploy',
    label: [state.deploying ? 'pending label' : 'deploy label', { ns: SCRIPT_PLUGIN }],
    icon: state.deploying ? 'ph--spinner-gap--regular' : 'ph--cloud-arrow-up--regular',
    disabled: state.deploying,
    classNames: state.deploying ? '[&_svg]:animate-spin' : '',
  });

  const copyAction = createMenuAction<DeployActionProperties>('copy', {
    type: 'copy',
    label: ['copy link label', { ns: SCRIPT_PLUGIN }],
    icon: 'ph--link--regular',
    disabled: !state.functionUrl,
  });

  return {
    nodes: [errorItem, deployAction, copyAction],
    edges: [
      { source: 'root', target: 'error' },
      { source: 'root', target: 'deploy' },
      { source: 'root', target: 'copy' },
    ],
  };
};

const useDeployDeps = ({ state, script }: { state: Partial<DeployState>; script: ScriptType }) => {
  const space = getSpace(script);
  const [fn] = useQuery(space, Filter.schema(FunctionType, { source: script }));
  const client = useClient();
  const existingFunctionUrl = useMemo(() => fn && getUserFunctionUrlInMetadata(getMeta(fn)), [fn]);
  return { space, fn, client, existingFunctionUrl };
};

export const useDeployState = ({ state, script }: { state: Partial<DeployState>; script: ScriptType }) => {
  const { space, client, existingFunctionUrl } = useDeployDeps({ state, script });
  useEffect(() => {
    if (!existingFunctionUrl) {
      return;
    }

    state.functionUrl = getInvocationUrl(existingFunctionUrl, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
    });
  }, [existingFunctionUrl, space]);

  useEffect(() => {
    state.deployed = Boolean(existingFunctionUrl) && !script.changed;
  }, [script.changed, existingFunctionUrl]);
};

export const useDeployHandler = ({ state, script }: { state: Partial<DeployState>; script: ScriptType }) => {
  const { space, fn, client, existingFunctionUrl } = useDeployDeps({ state, script });
  const { t } = useTranslation(SCRIPT_PLUGIN);

  return useCallback(async () => {
    if (!script.source || !space) {
      return;
    }

    state.error = undefined;
    state.deploying = true;

    try {
      const existingFunctionId = existingFunctionUrl?.split('/').at(-1);

      const bundler = new Bundler({ platform: 'browser', sandboxedModules: [], remoteModules: {} });
      const buildResult = await bundler.bundle({ source: script.source.target!.content });
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
      if (script.description !== undefined && script.description.trim() !== '') {
        deployedFunction.description = script.description;
      } else if (meta.description) {
        deployedFunction.description = meta.description;
      } else {
        log.verbose('no description in function metadata', { functionId });
      }

      if (meta.inputSchema) {
        deployedFunction.inputSchema = meta.inputSchema;
      } else {
        log.verbose('no input schema in function metadata', { functionId });
      }
      if (meta.outputSchema) {
        deployedFunction.outputSchema = meta.outputSchema;
      } else {
        log.verbose('no output schema in function metadata', { functionId });
      }

      setUserFunctionUrlInMetadata(getMeta(deployedFunction), `/${space.id}/${functionId}`);

      state.view = 'split';
    } catch (err: any) {
      log.catch(err);
      state.error = t('upload failed label');
    }
    state.deploying = false;
  }, [fn, client, t, existingFunctionUrl, script, script.name, script.source, space?.id ?? null]);
};

export const useCopyHandler = ({ state }: { state: Partial<DeployState> }) =>
  useCallback(async () => {
    if (!state.functionUrl) {
      return;
    }
    await navigator.clipboard.writeText(state.functionUrl);
  }, [state.functionUrl]);
