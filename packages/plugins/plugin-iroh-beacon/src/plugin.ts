//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { BeaconServiceModule, ReactSurface, Translations } from '#capabilities';
import { meta } from '#meta';

export const IrohBeaconPlugin = Plugin.define(meta).pipe(
  // Beacon service: creates transport + starts broadcasting.
  Plugin.addModule(BeaconServiceModule),

  // Status indicator surface.
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Translations),

  // Translations.
  Plugin.make,
);

export default IrohBeaconPlugin;
