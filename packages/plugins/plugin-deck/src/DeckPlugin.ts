//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

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

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

// NOTE(Zan): When producing values with immer, we shouldn't auto-freeze them because
//   our signal implementation needs to add some hidden properties to the produced values.
// TODO(Zan): Move this to a more global location if we use immer more broadly.
setAutoFreeze(false);

export const DeckPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule<void>({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule<void>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSurfaceModule<void>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<void>({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckSettings),
    requires: DeckSettings.requires,
    provides: DeckSettings.provides,
    activate: DeckSettings,
  }),
  Plugin.addLazyModule<typeof CheckAppScheme.requires, typeof CheckAppScheme.provides, void>(CheckAppScheme),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    requires: DeckState.requires,
    provides: DeckState.provides,
    activate: DeckState,
  }),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(UrlHandler),
  Plugin.addLazyModule(NotificationTracker),
  AppPlugin.addPluginAssetModule<void>({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default DeckPlugin;
