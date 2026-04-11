//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client/types';

import { BeaconServiceModule, ReactSurface } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const IrohBeaconPlugin = Plugin.define(meta).pipe(
  // Beacon service: creates transport + starts broadcasting.
  Plugin.addModule({
    activatesOn: ClientEvents.SpacesReady,
    activate: BeaconServiceModule,
  }),

  // Status indicator surface.
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),

  // Translations.
  AppPlugin.addTranslationsModule({ translations }),

  Plugin.make,
);
