//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { ChessContainer } from '../components';
import { CHESS_PLUGIN } from '../meta';
import { isObject, type GameType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: CHESS_PLUGIN,
      role: ['article', 'section'],
      filter: (data): data is { subject: GameType } => isObject(data.subject),
      component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
    }),
  );
