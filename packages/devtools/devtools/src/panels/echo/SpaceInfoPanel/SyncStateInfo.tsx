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
    <div className='p-2 text-sm'>
      <p className='text-base'>Sync state</p>
      <JsonView data={syncState} />
    </div>
  );
};
