//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ChessContainer, ChessComponent } from '../components';
import { meta } from '../meta';
import { ChessType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: ChessType } => Obj.instanceOf(ChessType, data.subject),
      component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
    }),
    createSurface({
      id: 'plugin-chess',
      role: 'canvas-node',
      // TODO(burdon): Should this dereference data.subject? If not why is that required above?
      filter: Obj.instanceOf(ChessType),
      component: ({ data }) => <ChessComponent game={data} />,
    }),
  ]);
