//
// Copyright 2026 DXOS.org
//

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { BeaconServiceModule, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const IrohBeaconPlugin = Plugin.define(meta).pipe(
  // Beacon service: creates transport + starts broadcasting. Genuine runtime event — spaces
  // become ready when the client observes them, not at a fixed startup point.
  Plugin.addModule({
    id: Capability.getModuleTag(BeaconServiceModule),
    activatesOn: ClientEvents.SpacesReady,
    requires: BeaconServiceModule.requires,
    provides: BeaconServiceModule.provides,
    activate: BeaconServiceModule,
  }),

  // Status indicator surface.
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),

  // Translations.
  AppPlugin.addTranslationsModule({ translations }),

  Plugin.make,
);

export default IrohBeaconPlugin;
