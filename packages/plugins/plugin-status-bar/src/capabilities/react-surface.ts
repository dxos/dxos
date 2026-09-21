//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as DeckRole from '@dxos/plugin-deck/DeckRole';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '#containers';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'statusBar',
          filter: Surface.makeFilter(DeckRole.StatusBar),
          component: StatusBarPanel,
        }),
        Surface.create({
          id: 'statusBarFooter',
          filter: Surface.makeFilter(DeckRole.StatusBarFooter),
          component: StatusBarActions,
        }),
        Surface.create({
          id: 'versionInfo',
          filter: Surface.makeFilter(DeckRole.VersionInfo),
          component: VersionNumber,
        }),
      ]),
    ),
  {
    roles: [
      'org.dxos.plugin.statusBar.role.footer',
      'org.dxos.plugin.statusBar.role.statusBar',
      'org.dxos.plugin.statusBar.role.versionInfo',
    ],
  },
);
