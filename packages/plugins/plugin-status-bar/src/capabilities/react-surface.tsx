//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as DeckRole from '@dxos/plugin-deck/DeckRole';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'statusBar',
        filter: Surface.makeFilter(DeckRole.StatusBar),
        component: () => <StatusBarPanel />,
      }),
      Surface.create({
        id: 'statusBarFooter',
        filter: Surface.makeFilter(DeckRole.StatusBarFooter),
        component: () => <StatusBarActions />,
      }),
      Surface.create({
        id: 'versionInfo',
        filter: Surface.makeFilter(DeckRole.VersionInfo),
        component: () => <VersionNumber />,
      }),
    ]),
  ),
);
