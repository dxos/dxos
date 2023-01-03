//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

export const SettingsPage = () => {
  const client = useClient();

  // TODO(burdon): Colorize.
  return (
    <div className='full-screen'>
      <div className='flex flex-1 drop-shadow-md justify-center'>
        <div className='flex flex-1 overflow-y-scroll bg-white text-sm p-4' style={{ width: 700, maxWidth: 700 }}>
          <pre>{JSON.stringify(client.config.values, undefined, 2)};</pre>
        </div>
      </div>
    </div>
  );
};
