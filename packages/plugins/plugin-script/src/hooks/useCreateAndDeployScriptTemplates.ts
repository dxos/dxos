//
// Copyright 2025 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as Script from '@dxos/compute/Script';
import { type Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { useClient } from '@dxos/react-client';

import { ScriptOperation } from '#types';

import { type Template } from '../templates';
import { deployScript } from '../util';

type DeploymentStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * Hook for creating and deploying multiple script templates concurrently.
 *
 * Takes a database and an array of script template IDs, then provides a callback
 * function that creates each script from its template and deploys it to that space.
 * All creation / deployment operations run concurrently for improved performance.
 */
export const useCreateAndDeployScriptTemplates = (db: Database.Database | undefined, scriptTemplates: Template[]) => {
  const { invokePromise } = useOperationInvoker();
  const client = useClient();
  const [status, setStatus] = useState<DeploymentStatus>('idle');
  const [error, setError] = useState<Error | undefined>(undefined);

  const handleCreateAndDeployScripts = useCallback(async () => {
    invariant(db);
    setStatus('pending');
    setError(undefined);

    const deploymentResults = await Promise.all(
      scriptTemplates.map(async (template) => {
        const createResult = await invokePromise(ScriptOperation.CreateScript, {
          db,
          initialTemplateId: template.id as any,
        });
        invariant(Obj.instanceOf(Script.Script, createResult.data?.object));
        await invokePromise(SpaceOperation.AddObject, { object: createResult.data.object }, { spaceId: db.spaceId });

        return deployScript({ db, client, script: createResult.data.object });
      }),
    );

    const hasErrors = deploymentResults.some((result) => !result.success);
    setStatus(hasErrors ? 'error' : 'success');
  }, [db, invokePromise, client, scriptTemplates]);

  // TODO(burdon): Return onCreateAndDeployScripts.
  return { handleCreateAndDeployScripts, status, error };
};
