//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect/Function';
import { useCallback } from 'react';

import { chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';

import { ScriptAction } from '../types';
import { deployScript } from '../util';

// TODO: (ZaymonFC): Maintain an activity log / lifecycle
//  - Return pending / complete / on error
//  - Parallelize creation / deployment for multiple scripts

export const useCreateAndDeployScriptTemplates = (space: Space | undefined, scriptTemplateIds: string[]) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();

  const handleCreateAndDeployScripts = useCallback(async () => {
    invariant(space);

    for (const scriptTemplateId of scriptTemplateIds) {
      const result = await dispatch(
        pipe(
          createIntent(ScriptAction.Create, { space, initialTemplateId: scriptTemplateId }),
          chain(SpaceAction.AddObject, { target: space }),
        ),
      );
      invariant(isInstanceOf(ScriptType, result.data?.object));
      await deployScript({ space, client, script: result.data.object });
    }
  }, [scriptTemplateIds, space]);

  return handleCreateAndDeployScripts;
};
