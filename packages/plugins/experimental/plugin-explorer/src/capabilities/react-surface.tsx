//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { ExplorerArticle } from '../components';
import { EXPLORER_PLUGIN } from '../meta';
import { ViewType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${EXPLORER_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: ViewType } => data.subject instanceof ViewType,
      component: ({ data }) => <ExplorerArticle view={data.subject} />,
    }),
  );
