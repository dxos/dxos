//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';

import { ExplorerContainer } from '../components';
import { EXPLORER_PLUGIN } from '../meta';
import { ViewType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${EXPLORER_PLUGIN}/article`,
      role: ['article', 'section'],
      filter: (data): data is { subject: ViewType } => isInstanceOf(ViewType, data.subject),
      component: ({ data, role }) => <ExplorerContainer view={data.subject} role={role} />,
    }),
  );
