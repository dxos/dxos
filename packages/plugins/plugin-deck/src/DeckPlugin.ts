//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
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
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    firesAfterActivation: [DeckEvents.SettingsReady],
    activate: DeckSettings,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(DeckEvents.SettingsReady, ActivationEvents.ProcessManagerReady),
    activate: CheckAppScheme,
  }),
  Plugin.addModule({
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: ActivationEvent.oneOf(AppActivationEvents.SetupSettings, AppActivationEvents.SetupAppGraph),
    firesAfterActivation: [AppActivationEvents.LayoutReady, DeckEvents.StateReady],
    activate: DeckState,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: ReactRoot,
  }),
  // Plugin.addModule({
  //   activatesOn: Events.SetupArtifactDefinition,
  //   activate: Tools,
  // }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, DeckEvents.StateReady),
    activate: UrlHandler,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvent.allOf(ActivationEvents.ProcessManagerReady, DeckEvents.StateReady),
    activate: NotificationTracker,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default DeckPlugin;
