//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { OutlinerMain, TreeSection } from '../components';
import { OUTLINER_PLUGIN } from '../meta';
import { TreeType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${OUTLINER_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: TreeType } => data.subject instanceof TreeType,
      component: ({ data }) => <OutlinerMain tree={data.subject} />,
    }),
    createSurface({
      id: `${OUTLINER_PLUGIN}/section`,
      role: 'section',
      filter: (data): data is { subject: TreeType } => data.subject instanceof TreeType,
      component: ({ data }) => <TreeSection tree={data.subject} />,
    }),
  ]);
