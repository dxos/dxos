//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import { useCallback, useState } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';

import { type Template } from '../templates';
import { ScriptAction } from '../types';
import { deployScript } from '../util';

type DeploymentStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Hook for creating and deploying multiple script templates concurrently.
 *
 * Takes a space and an array of script template IDs, then provides a callback
 * function that creates each script from its template and deploys it to the space.
 * All creation / deployment operations run concurrently for improved performance.
 */
export const useCreateAndDeployScriptTemplates = (space: Space | undefined, scriptTemplates: Template[]) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const [status, setStatus] = useState<DeploymentStatus>('idle');
  const [error, setError] = useState<Error | undefined>(undefined);

  const handleCreateAndDeployScripts = useCallback(async () => {
    invariant(space);
    setStatus('pending');
    setError(undefined);

    const deploymentResults = await Promise.all(
      scriptTemplates.map(async (template) => {
        const result = await dispatch(
          Function.pipe(
            createIntent(ScriptAction.CreateScript, { space, initialTemplateId: template.id as any }),
            chain(SpaceAction.AddObject, { target: space }),
          ),
        );
        invariant(Obj.instanceOf(ScriptType, result.data?.object));

        return deployScript({ space, client, script: result.data.object });
      }),
    );

    const hasErrors = deploymentResults.some((result) => !result.success);
    setStatus(hasErrors ? 'error' : 'success');
  }, [space, dispatch, client, scriptTemplates]);

  // TODO(burdon): Return onCreateAndDeployScripts.
  return { handleCreateAndDeployScripts, status, error };
};
