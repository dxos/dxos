//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, ReactSurface } from './capabilities';
import { meta } from './meta';

export const FixturePlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    id: 'fixture.startup',
    activatesOn: 'startup',
    activate: () => undefined,
  }),
  Plugin.make,
);
