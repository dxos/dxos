//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { definePlugin } from '@dxos/surface';

import { Stack } from '../components';

export const StackPlugin = definePlugin({
  meta: {
    id: 'RoutesPlugin',
  },
  provides: {
    components: {
      default: () => <Stack />,
    },
  },
});
