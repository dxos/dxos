//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CrxSettings, InstallClipListener, InstallPageActions, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const CrxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSettingsModule({ activate: CrxSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'install-crx-bridge',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: InstallClipListener,
  }),
  Plugin.addModule({
    id: 'install-page-actions',
    activatesOn: ActivationEvents.ProcessManagerReady,
    activate: InstallPageActions,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default CrxPlugin;
