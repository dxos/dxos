//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { ChessboardContainer } from '../../components';
import { meta } from '../../meta';
import { Chess } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section', 'card--content'],
        // TODO(burdon): Could this be standardized so that we don't require a subject property.
        filter: (data): data is { subject: Chess.Game } => Obj.instanceOf(Chess.Game, data.subject),
        component: ({ data, role }) => <ChessboardContainer role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
