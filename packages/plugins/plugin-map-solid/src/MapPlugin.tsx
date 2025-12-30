//
// Copyright 2025 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

import { Surface } from './capabilities';
import { meta } from './meta';

export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'surface',
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: Surface,
  }),
  Plugin.make,
);
