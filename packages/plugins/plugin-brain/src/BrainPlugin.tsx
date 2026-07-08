//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { FactStore, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const BrainPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'fact-store',
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: FactStore,
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default BrainPlugin;
