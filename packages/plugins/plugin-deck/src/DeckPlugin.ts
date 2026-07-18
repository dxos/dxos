//
// Copyright 2025 DXOS.org
//

import { setAutoFreeze } from 'immer';

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(DeckSettings),
  Plugin.addLazyModule(CheckAppScheme),
  Plugin.addLazyModule(DeckState),
  Plugin.addLazyModule(ReactRoot),
  Plugin.addLazyModule(UrlHandler),
  Plugin.addLazyModule(NotificationTracker),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default DeckPlugin;
