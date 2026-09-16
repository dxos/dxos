//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { getUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { type Database, Obj, Query, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { type Client, useClient } from '@dxos/react-client';
import { type TFunction } from '@dxos/react-ui';
import { type ActionGraphProps, createMenuAction } from '@dxos/react-ui-menu';
import { messageValence } from '@dxos/ui-theme';

import { meta } from '#meta';

import { deployScript, getFunctionUrl, isScriptDeployed } from '../util/index.ts';

export type DeployActionProperties = { type: 'deploy' } | { type: 'copy' };

export type DeployState = {
  deploying: boolean;
  deployed: boolean;
  functionUrl: string;
  error: string;
};

import { type ScriptToolbarStateStore } from './useToolbarState.ts';

export type CreateDeployOptions = {
  state: ScriptToolbarStateStore;
  script: Script.Script;
  fn: Operation.PersistentOperation;
  db?: Database.Database;
  existingFunctionId?: string;
  client: Client;
  t: TFunction;
};

export const createDeploy = ({
  state,
  script,
  db,
  fn,
  client,
  existingFunctionId,
  t,
}: CreateDeployOptions): ActionGraphProps => {
  const { value } = state;

  // TODO(wittjosiah): Should this be an action?
  const errorItem = createMenuAction('error', () => {}, {
    label: value.error ?? ['no-error.label', { ns: meta.profile.key }],
    icon: 'ph--warning-circle--regular',
    hidden: !value.error,
    classNames: value.error && messageValence('error'),
  });

  const deployAction = createMenuAction<DeployActionProperties>(
    'deploy',
    async () => {
      if (!script.source || !db) {
        return;
      }

      state.set('error', undefined);
      state.set('deploying', true);

      const result = await deployScript({ script, client, db, fn, existingFunctionId });

      if (!result.success) {
        log.catch(result.error);
        state.set('error', t('upload-failed.label'));
      }

      state.set('deploying', false);
    },
    {
      type: 'deploy',
      label: [value.deploying ? 'publishing.label' : 'deploy.label', { ns: meta.profile.key }],
      icon: value.deploying ? 'ph--spinner-gap--regular' : 'ph--cloud-arrow-up--regular',
      disabled: value.deploying,
      classNames: value.deploying ? '[&_svg]:animate-spin' : '',
    },
  );

  const copyAction = createMenuAction<DeployActionProperties>(
    'copy',
    async () => {
      if (value.functionUrl) {
        await navigator.clipboard.writeText(value.functionUrl);
      }
    },
    {
      type: 'copy',
      label: ['copy-link.label', { ns: meta.profile.key }],
      icon: 'ph--link--regular',
      disabled: !value.functionUrl,
    },
  );

  return {
    nodes: [errorItem, deployAction, copyAction],
    edges: [
      { source: 'root', target: 'error', relation: 'child' },
      { source: 'root', target: 'deploy', relation: 'child' },
      { source: 'root', target: 'copy', relation: 'child' },
    ],
  };
};

export const useDeployState = ({ state, script }: { state: ScriptToolbarStateStore; script: Script.Script }) => {
  const { db, client, fn, existingFunctionId } = useDeployDeps({ script });
  useEffect(() => {
    if (!existingFunctionId) {
      return;
    }

    state.set(
      'functionUrl',
      getFunctionUrl({
        script,
        fn,
        edgeUrl: client.config.values.runtime?.services?.edge?.url ?? '',
      }),
    );
  }, [existingFunctionId, db, fn, script, client.config.values.runtime?.services?.edge?.url, state]);

  useEffect(() => {
    state.set('deployed', isScriptDeployed({ script, fn }));
  }, [script.changed, existingFunctionId, fn, script, state]);
};

export const useDeployDeps = ({ script }: { script: Script.Script }) => {
  const client = useClient();
  const db = Obj.getDatabase(script);
  const [fn] = useQuery(db, Query.type(Operation.PersistentOperation, { source: Ref.make(script) }));
  const existingFunctionId = useMemo(() => fn && getUserFunctionIdInMetadata(Obj.getMeta(fn)), [fn]);
  return { client, db, fn, existingFunctionId };
};
