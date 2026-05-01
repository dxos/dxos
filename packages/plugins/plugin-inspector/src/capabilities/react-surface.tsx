//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { InspectorPanel } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'inspector',
        filter: AppSurface.literal(Surface.makeType<{ subject: string }>('deck-companion--inspector'), 'inspector'),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <InspectorPanel space={space} />;
        },
      }),
    ]),
  ),
);
