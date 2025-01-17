//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { TokensContainer } from '../components';
import { meta, TOKEN_MANAGER_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'settings',
      filter: (data): data is any => data.subject === TOKEN_MANAGER_PLUGIN,
      component: () => <TokensContainer />,
    }),
  ]);
