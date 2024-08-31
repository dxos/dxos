//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Status } from '@dxos/react-ui';

export const PlankLoading = () => {
  return (
    <div role='none' className='bs-[100dvh] row-span-2 grid place-items-center'>
      <Status indeterminate aria-label='Initializing' />
    </div>
  );
};
