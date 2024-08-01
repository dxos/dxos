//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { useAsyncEffect } from '@dxos/react-async';

import { JsonView } from '../../../components';
import { useDevtoolsState } from '../../../hooks';

export const SyncStateInfo = () => {
  const { space } = useDevtoolsState();
  const [syncState, setSyncState] = useState({});

  useAsyncEffect(async () => {
    space && setSyncState(await space.db.coreDatabase.getSyncState());
  }, [space]);

  return (
    <div>
      <div className='flex w-full bg-gray-50 p-2'>Sync state</div>
      <JsonView data={syncState} />
    </div>
  );
};
