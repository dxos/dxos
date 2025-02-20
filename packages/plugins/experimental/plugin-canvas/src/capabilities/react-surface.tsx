//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CanvasContainer } from '../components';
import { CANVAS_PLUGIN } from '../meta';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: CANVAS_PLUGIN,
      role: ['article', 'section'],
      filter: (data): data is { subject: CanvasBoardType } => data.subject instanceof CanvasBoardType,
      component: ({ data, role }) => <CanvasContainer canvas={data.subject} role={role} />,
    }),
  );
