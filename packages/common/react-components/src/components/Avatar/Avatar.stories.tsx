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
    fallbackValue: '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
    label: <p>Display name</p>,
    description: <p>Away</p>,
    status: 'active',
    variant: 'circle',
    size: 12,
    slots: {
      root: { className: 'flex gap-2' },
      labels: { className: 'block' }
    }
  }
};
