//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';

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
      filter: (data): data is any => isInstanceOf(ChessType, data),
      component: ({ data }) => <ChessComponent game={data} />,
    }),
  ]);
