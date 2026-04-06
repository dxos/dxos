//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';

import { meta } from '#meta';

import { Surface } from '#capabilities';

export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'surface',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: Surface,
  }),
  Plugin.make,
);
