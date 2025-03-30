//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';

import { JournalContainer, OutlinerContainer } from '../components';
import { OUTLINER_PLUGIN } from '../meta';
import { JournalType, TreeType } from '../types';

export default () => [
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/journal`,
      role: ['article', 'section'],
      filter: (data): data is { subject: JournalType } => isInstanceOf(JournalType, data.subject), // TODO(burdon): Use consistently.
      component: ({ data, role }) => <JournalContainer journal={data.subject} role={role} />,
    }),
  ),
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${OUTLINER_PLUGIN}/article/outline`,
      role: ['article', 'section'],
      filter: (data): data is { subject: TreeType } => isInstanceOf(TreeType, data.subject),
      component: ({ data, role }) => <OutlinerContainer tree={data.subject} role={role} />,
    }),
  ),
];
