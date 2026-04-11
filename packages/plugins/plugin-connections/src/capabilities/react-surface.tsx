//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';

import { ConnectionsPanel } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // Settings article — always accessible via Settings.
      Surface.create({
        id: 'connections-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }
          return <ConnectionsPanel space={space} />;
        },
      }),
      // Deck companion panel.
      Surface.create({
        id: 'connections-companion',
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
