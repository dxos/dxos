//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ProgressRegistry } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'progress-registry',
    activatesOn: ActivationEvents.Startup,
    activate: () => ProgressRegistry(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProgressPlugin;
