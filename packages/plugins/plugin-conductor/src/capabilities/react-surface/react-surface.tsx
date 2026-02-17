//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';

import { CanvasContainer } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: CanvasBoard.CanvasBoard } =>
          Obj.instanceOf(CanvasBoard.CanvasBoard, data.subject),
        component: ({ data, role }) => <CanvasContainer role={role} subject={data.subject} />,
      }),
    ),
  ),
);
