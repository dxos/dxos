//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { Duffel } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const DuffelPlugin = Plugin.define(meta).pipe(
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: `${meta.id}/duffel`,
    activatesOn: ActivationEvents.Startup,
    activate: Duffel,
  }),
  Plugin.make,
);

export default DuffelPlugin;
