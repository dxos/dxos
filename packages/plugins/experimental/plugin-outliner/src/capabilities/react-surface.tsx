//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { OutlinerContainer } from '../components';
import { OUTLINER_PLUGIN } from '../meta';
import { TreeType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${OUTLINER_PLUGIN}/article`,
      role: ['article', 'section'],
      filter: (data): data is { subject: TreeType } => data.subject instanceof TreeType,
      component: ({ data, role }) => <OutlinerContainer tree={data.subject} role={role} />,
    }),
  );
