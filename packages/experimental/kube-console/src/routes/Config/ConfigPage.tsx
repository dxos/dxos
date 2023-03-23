//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useConfig } from '@dxos/react-client';

export const ConfigPage = () => {
  const config = useConfig();

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <pre className='m-2'>{JSON.stringify(config.values, undefined, 2)}</pre>
    </div>
  );
};
