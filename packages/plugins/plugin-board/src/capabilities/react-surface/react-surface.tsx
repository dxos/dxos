//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { BoardContainer } from '../../components';
import { meta } from '../../meta';
import { Board } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Board.Board } => Obj.instanceOf(Board.Board, data.subject),
        component: ({ role, data }) => <BoardContainer role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
