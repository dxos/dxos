//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { BeaconServiceModule, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const IrohBeaconPlugin = Plugin.define(meta).pipe(
  // Beacon service: creates transport + starts broadcasting.
  Plugin.addModule(BeaconServiceModule),

  // Status indicator surface.
  Plugin.addModule(ReactSurface),

  // Translations.
  Plugin.addModule(AppCapability.translations(translations)),

  Plugin.make,
);

export default IrohBeaconPlugin;
