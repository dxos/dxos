//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { FunctionType, type ScriptType, getUserFunctionUrlInMetadata } from '@dxos/functions';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';
import { errorMessageColors } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';
import { deployScript, getFunctionUrl, isScriptDeployed } from '../util';

export type DeployActionProperties = { type: 'deploy' } | { type: 'copy' };

export type DeployState = {
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
    classNames: state.error && errorMessageColors,
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

export const useDeployState = ({ state, script }: { state: Partial<DeployState>; script: ScriptType }) => {
  const { space, client, fn, existingFunctionUrl } = useDeployDeps({ script });
  useEffect(() => {
    if (!existingFunctionUrl) {
      return;
    }

    state.functionUrl = getFunctionUrl({
      script,
      fn,
      edgeUrl: client.config.values.runtime?.services?.edge?.url ?? '',
    });
  }, [existingFunctionUrl, space, fn, script, client.config.values.runtime?.services?.edge?.url]);

  useEffect(() => {
    state.deployed = isScriptDeployed({ script, fn });
  }, [script.changed, existingFunctionUrl, fn, script]);
};

export const useDeployDeps = ({ script }: { script: ScriptType }) => {
  const space = getSpace(script);
  const [fn] = useQuery(space, Filter.schema(FunctionType, { source: script }));
  const client = useClient();
  const existingFunctionUrl = useMemo(() => fn && getUserFunctionUrlInMetadata(getMeta(fn)), [fn]);
  return { space, fn, client, existingFunctionUrl };
};

/**
 * Manage EDGE function deployment.
 */
export const useDeployHandler = ({ state, script }: { state: Partial<DeployState>; script: ScriptType }) => {
  const { space, fn, client, existingFunctionUrl } = useDeployDeps({ script });
  const { t } = useTranslation(SCRIPT_PLUGIN);

  return useCallback(async () => {
    if (!script.source || !space) {
      return;
    }

    state.error = undefined;
    state.deploying = true;

    const result = await deployScript({ script, client, space, fn, existingFunctionUrl });

    if (!result.success) {
      log.catch(result.error);
      state.error = t('upload failed label');
    }

    state.deploying = false;
  }, [fn, client, t, existingFunctionUrl, script, space]);
};

export const useCopyHandler = ({ state }: { state: Partial<DeployState> }) =>
  useCallback(async () => {
    if (!state.functionUrl) {
      return;
    }
    await navigator.clipboard.writeText(state.functionUrl);
  }, [state.functionUrl]);
