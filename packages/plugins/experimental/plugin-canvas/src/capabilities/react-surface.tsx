//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { CanvasContainer } from '../components';
import { CANVAS_PLUGIN } from '../meta';
import { CanvasBoardType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: CANVAS_PLUGIN,
      role: 'article',
      filter: (data): data is { subject: CanvasBoardType } => data.subject instanceof CanvasBoardType,
      component: ({ data }) => <CanvasContainer canvas={data.subject} />,
    }),
  );
