//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ChessContainer } from '../components';
import { ChessComponent } from '../components/ChessComponent';
import { CHESS_PLUGIN } from '../meta';
import { ChessType, isObject } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: CHESS_PLUGIN,
      role: ['article', 'section'],
      filter: (data): data is { subject: ChessType } => isObject(data.subject),
      component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
    }),
    createSurface({
      id: 'plugin-chess',
      role: 'canvas-node',
      filter: Obj.instanceOf(ChessType),
      component: ({ data }) => <ChessComponent game={data} />,
    }),
  ]);
