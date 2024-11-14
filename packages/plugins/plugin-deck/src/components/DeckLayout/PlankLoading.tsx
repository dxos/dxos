//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Status } from '@dxos/react-ui';

export const PlankLoading = () => {
  return (
    <div role='none' className='grid place-items-center attention-surface'>
      <Status indeterminate aria-label='Initializing' />
    </div>
  );
};
