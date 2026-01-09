//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { MasonryContainer } from '../../components/MasonryContainer';
import { meta } from '../../meta';
import { Masonry } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Masonry.Masonry } => Obj.instanceOf(Masonry.Masonry, data.subject),
        component: ({ data, role }) => <MasonryContainer object={data.subject} role={role} />,
      }),
    ]),
  ),
);
