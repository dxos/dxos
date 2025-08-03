//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, type PluginContext, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { BoardContainer } from '../components';
import { meta } from '../meta';
import { Board } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: Board.Board } => Obj.instanceOf(Board.Board, data.subject),
      component: ({ data, role }) => <BoardContainer board={data.subject} role={role} />,
    }),
  ]);
