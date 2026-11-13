//
// Copyright 2026 DXOS.org
//

import { useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import { type Space } from '@dxos/react-client/echo';

/** Creates an object through a create-object contribution; the workbench makes each new object the sample. */
export const useCreateSample = (space: Space | undefined) => {
  const [error, setError] = useState<string>();
  const run = Hooks.useSpaceCallback(space?.id, [], (entry: SpaceCapabilities.CreateObjectEntry, space: Space) =>
    entry.createObject({}, { db: space.db }),
  );
  const create = (entry: SpaceCapabilities.CreateObjectEntry) => {
    if (space) {
      setError(undefined);
      run(entry, space).catch((error) => setError(String(error)));
    }
  };
  return { create, error };
};
