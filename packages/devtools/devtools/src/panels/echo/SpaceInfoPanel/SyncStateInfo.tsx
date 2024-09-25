//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { useAsyncEffect } from '@dxos/react-hooks';

import { JsonView } from '../../../components';
import { useDevtoolsState } from '../../../hooks';

export const SyncStateInfo = () => {
  const { space } = useDevtoolsState();
  const [syncState, setSyncState] = useState({});

  const refresh = async () => {
    space && setSyncState(await space.db.coreDatabase.getSyncState());
  };
  useAsyncEffect(refresh, [space]);

  return (
    <div>
      <div className='flex w-full bg-gray-50 p-2'>
        Sync state <button onClick={refresh}>Refresh</button>
      </div>
      <JsonView data={syncState} />
    </div>
  );
};
