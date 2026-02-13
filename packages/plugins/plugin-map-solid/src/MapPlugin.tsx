//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';

import { Surface } from './capabilities';
import { meta } from './meta';

export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'surface',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: Surface,
  }),
  Plugin.make,
);
