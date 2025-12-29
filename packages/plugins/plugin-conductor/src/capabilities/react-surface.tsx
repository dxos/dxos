//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { CanvasContainer } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(
    Common.Capability.ReactSurface,
    Common.createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: CanvasBoardType } => Obj.instanceOf(CanvasBoardType, data.subject),
      component: ({ data, role }) => <CanvasContainer canvas={data.subject} role={role} />,
    }),
  ),
);
