//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { Obj, Query, Ref } from '@dxos/echo';
import { Function, type Script, getUserFunctionIdInMetadata } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, getSpace, useQuery } from '@dxos/react-client/echo';
import { type TFunction } from '@dxos/react-ui';
import { createMenuAction } from '@dxos/react-ui-menu';
import { errorMessageColors } from '@dxos/react-ui-theme';

import { meta } from '../meta';
import { deployScript, getFunctionUrl, isScriptDeployed } from '../util';

export type DeployActionProperties = { type: 'deploy' } | { type: 'copy' };

export type DeployState = {
  deploying: boolean;
  deployed: boolean;
  functionUrl: string;
  error: string;
};

export type CreateDeployOptions = {
  state: Partial<DeployState>;
  script: Script.Script;
  fn: Function.Function;
  space?: Space;
  existingFunctionId?: string;
  client: Client;
  t: TFunction;
};

export const createDeploy = ({ state, script, space, fn, client, existingFunctionId, t }: CreateDeployOptions) => {
  // TODO(wittjosiah): Should this be an action?
  const errorItem = createMenuAction('error', () => {}, {
    label: state.error ?? ['no error label', { ns: meta.id }],
    icon: 'ph--warning-circle--regular',
    hidden: !state.error,
    classNames: state.error && errorMessageColors,
  });

  const deployAction = createMenuAction<DeployActionProperties>(
    'deploy',
    async () => {
      if (!script.source || !space) {
        return;
      }

      state.error = undefined;
      state.deploying = true;

      const result = await deployScript({ script, client, space, fn, existingFunctionId });

      if (!result.success) {
        log.catch(result.error);
        state.error = t('upload failed label');
      }

      state.deploying = false;
    },
    {
      type: 'deploy',
      label: [state.deploying ? 'publishing label' : 'deploy label', { ns: meta.id }],
      icon: state.deploying ? 'ph--spinner-gap--regular' : 'ph--cloud-arrow-up--regular',
      disabled: state.deploying,
      classNames: state.deploying ? '[&_svg]:animate-spin' : '',
    },
  );

  const copyAction = createMenuAction<DeployActionProperties>(
    'copy',
    async () => {
      if (state.functionUrl) {
        await navigator.clipboard.writeText(state.functionUrl);
      }
    },
    {
      type: 'copy',
      label: ['copy link label', { ns: meta.id }],
      icon: 'ph--link--regular',
      disabled: !state.functionUrl,
    },
  );

  return {
    nodes: [errorItem, deployAction, copyAction],
    edges: [
      { source: 'root', target: 'error' },
      { source: 'root', target: 'deploy' },
      { source: 'root', target: 'copy' },
    ],
  };
};

export const useDeployState = ({ state, script }: { state: Partial<DeployState>; script: Script.Script }) => {
  const { space, client, fn, existingFunctionId } = useDeployDeps({ script });
  useEffect(() => {
    if (!existingFunctionId) {
      return;
    }

    state.functionUrl = getFunctionUrl({
      script,
      fn,
      edgeUrl: client.config.values.runtime?.services?.edge?.url ?? '',
    });
  }, [existingFunctionId, space, fn, script, client.config.values.runtime?.services?.edge?.url]);

  useEffect(() => {
    state.deployed = isScriptDeployed({ script, fn });
  }, [script.changed, existingFunctionId, fn, script]);
};

export const useDeployDeps = ({ script }: { script: Script.Script }) => {
  const client = useClient();
  const space = getSpace(script);
  const [fn] = useQuery(space, Query.type(Function.Function, { source: Ref.make(script) }));
  const existingFunctionId = useMemo(() => fn && getUserFunctionIdInMetadata(Obj.getMeta(fn)), [fn]);
  return { client, space, fn, existingFunctionId };
};
