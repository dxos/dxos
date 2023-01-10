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
    label: <p>Hello</p>,
    description: <p>Potatoes</p>,
    status: 'active',
    variant: 'circle',
    size: 12,
    slots: {
      root: { className: 'flex gap-2' },
      labels: { className: 'block' }
    }
  }
};
