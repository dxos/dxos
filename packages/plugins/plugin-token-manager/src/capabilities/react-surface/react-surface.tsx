//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/plugin-space';

import { TokensContainer } from '../../containers';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === `${meta.id}.space-settings`,
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <TokensContainer db={space.db} />;
        },
      }),
    ]),
  ),
);
