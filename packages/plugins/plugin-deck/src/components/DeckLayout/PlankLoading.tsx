//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Status } from '@dxos/react-ui';

export const PlankLoading = () => {
  return (
    <div role='none' className='grid bs-[100dvh] place-items-center row-span-2'>
      <Status indeterminate aria-label='Initializing' />
    </div>
  );
};
