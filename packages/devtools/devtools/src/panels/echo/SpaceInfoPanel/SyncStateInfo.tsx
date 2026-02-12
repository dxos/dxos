//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import type { Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import type { SpaceSyncState } from '@dxos/echo-db';
import { create } from '@dxos/protocols/buf';
import { SpaceSyncStateSchema } from '@dxos/protocols/buf/dxos/echo/service_pb';

import { JsonView } from '../../../components';

interface SyncStateInfoProps {
  space: Space;
}

export const SyncStateInfo = ({ space }: SyncStateInfoProps) => {
  const [syncState, setSyncState] = useState<SpaceSyncState>(create(SpaceSyncStateSchema));

  useEffect(() => {
    if (space) {
      return space.internal.db.coreDatabase.subscribeToSyncState(Context.default(), (syncState) => {
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
