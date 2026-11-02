//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as DeckSurface from '@dxos/plugin-deck/DeckSurface';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'statusBar',
        filter: Surface.makeFilter(DeckSurface.StatusBar),
        component: StatusBarPanel,
      }),
      Surface.create({
        id: 'statusBarFooter',
        filter: Surface.makeFilter(DeckSurface.StatusBarFooter),
        component: StatusBarActions,
      }),
      Surface.create({
        id: 'versionInfo',
        filter: Surface.makeFilter(DeckSurface.VersionInfo),
        component: VersionNumber,
      }),
    ]),
  ),
);
