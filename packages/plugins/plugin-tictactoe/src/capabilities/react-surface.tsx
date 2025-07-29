//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { TicTacToeContainer } from '../components';
import { meta } from '../meta';
import { TicTacToeType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section', 'card--intrinsic', 'card--extrinsic', 'popover', 'transclusion'],
      filter: (data): data is { subject: TicTacToeType } => Obj.instanceOf(TicTacToeType, data.subject),
      component: ({ data, role }) => <TicTacToeContainer game={data.subject} role={role} />,
    }),
  ]);
