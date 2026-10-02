//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as DeckRole from '@dxos/plugin-deck/DeckRole';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'statusBar',
        filter: Surface.Root.makeFilter(DeckRole.StatusBar),
        component: StatusBarPanel,
      }),
      Surface.Root.create({
        id: 'statusBarFooter',
        filter: Surface.Root.makeFilter(DeckRole.StatusBarFooter),
        component: StatusBarActions,
      }),
      Surface.Root.create({
        id: 'versionInfo',
        filter: Surface.Root.makeFilter(DeckRole.VersionInfo),
        component: VersionNumber,
      }),
    ]),
  ),
);
