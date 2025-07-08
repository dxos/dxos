//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { contributes, Capabilities, type PluginContext, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { BoardContainer } from '../components';
import { meta } from '../meta';
import { BoardType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: BoardType } => Obj.instanceOf(BoardType, data.subject),
      component: ({ data, role }) => <BoardContainer board={data.subject} role={role} />,
    }),
  ]);
