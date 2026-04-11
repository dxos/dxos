//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { ConnectionsPanel } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'connections',
        role: 'deck-companion--connections',
        filter: AppSurface.literalSection('connections'),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <ConnectionsPanel space={space} />;
        },
      }),
    ]),
  ),
);
