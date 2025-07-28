//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ChessContainer } from '../components';
import { meta } from '../meta';
import { ChessType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section', 'card--intrinsic', 'card--extrinsic', 'popover', 'transclusion'],
      // TODO(burdon): Could this be standardized so that we don't require a subject property (like below)?
      filter: (data): data is { subject: ChessType } => Obj.instanceOf(ChessType, data.subject),
      component: ({ data, role }) => <ChessContainer game={data.subject} role={role} />,
    }),
  ]);
