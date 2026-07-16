//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, ReactRoot, SpotlightDismiss, State } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { SpotlightEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SpotlightPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addLazyModule(State, {
    // Migration bridge for unmigrated StateReady/LayoutReady listeners.
    compatFires: [SpotlightEvents.StateReady, AppActivationEvents.LayoutReady],
  }),
  Plugin.addLazyModule(SpotlightDismiss),
  Plugin.addLazyModule(ReactRoot),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SpotlightPlugin;
