//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CrxSettings, InstallClipListener, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const CrxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({ activate: CrxSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'install-crx-bridge',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: InstallClipListener,
  }),
  Plugin.make,
);

export default CrxPlugin;
