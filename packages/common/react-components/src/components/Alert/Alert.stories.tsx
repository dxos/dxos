//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Info } from 'phosphor-react';
import React from 'react';

import { Alert } from './Alert';

export default {
  component: Alert
};

export const Default = {
  args: {
    title: (
      <>
        <Info className='inline w-5 h-5 mb-1' weight='duotone' />
        {' Alert title'}
      </>
    ),
    valence: 'error',
    children: 'Alert content'
  }
};
