//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import type { Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import type { SpaceSyncState } from '@dxos/echo-client';

import { JsonView } from '../../../components';

interface SyncStateInfoProps {
  space: Space;
}

export const SyncStateInfo = ({ space }: SyncStateInfoProps) => {
  const [syncState, setSyncState] = useState<SpaceSyncState>({});

  useEffect(() => {
    if (space) {
      return space.internal.db.subscribeToAutomergeSyncState(Context.default(), (syncState) => {
        setSyncState(syncState);
      });
    }
  }, [space]);

  return (
    <div className='p-2 text-sm'>
      <p className='text-base'>Sync state</p>
      <JsonView data={syncState} />
    </div>
  );
};
