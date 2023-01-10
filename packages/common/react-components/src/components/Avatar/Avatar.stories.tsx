//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Avatar } from './Avatar';

export default {
  component: Avatar
};

export const Default = {
  args: {
    fallbackValue: 'squirrel',
    label: <span className='sr-only'>Hello</span>,
    status: 'active',
    variant: 'circle',
    size: 12
  }
};
