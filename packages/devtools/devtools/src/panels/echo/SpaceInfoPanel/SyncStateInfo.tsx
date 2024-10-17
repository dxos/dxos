//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Context } from '@dxos/context';

import { JsonView } from '../../../components';
import { useDevtoolsState } from '../../../hooks';

export const SyncStateInfo = () => {
  const { space } = useDevtoolsState();
  const [syncState, setSyncState] = useState({});

  useEffect(() => {
    if (space) {
      return space.db.coreDatabase.subscribeToSyncState(Context.default(), (syncState) => {
        setSyncState(syncState);
      });
    }
  }, [space]);

  return (
    <div>
      <div className='flex w-full bg-gray-50 p-2'>Sync state</div>
      <JsonView data={syncState} />
    </div>
  );
};
