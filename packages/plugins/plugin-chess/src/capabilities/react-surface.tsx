//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ChessboardContainer } from '../components';
import { meta } from '../meta';
import { Chess } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section', 'card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion'],
      // TODO(burdon): Could this be standardized so that we don't require a subject property.
      filter: (data): data is { subject: Chess.Game } => Obj.instanceOf(Chess.Game, data.subject),
      component: ({ data, role }) => <ChessboardContainer game={data.subject} role={role} />,
    }),
  ]),
);
