//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  CheckAppScheme,
  DeckSettings,
  DeckState,
  NotificationTracker,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  UrlHandler,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { DeckEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckSettings),
    requires: DeckSettings.requires,
    provides: DeckSettings.provides,
    // Migration bridge for unmigrated SettingsReady listeners.
    compatFires: [DeckEvents.SettingsReady],
    activate: DeckSettings,
  }),
  Plugin.addLazyModule(CheckAppScheme),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    requires: DeckState.requires,
    provides: DeckState.provides,
    // Migration bridge for unmigrated LayoutReady/StateReady listeners.
    compatFires: [AppActivationEvents.LayoutReady, DeckEvents.StateReady],
    activate: DeckState,
  }),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(UrlHandler),
  Plugin.addLazyModule(NotificationTracker),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default DeckPlugin;
