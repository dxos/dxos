//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, MarkdownExtension, OperationHandler, PresenterSettings, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = Plugin.define(meta).pipe(
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
  AppPlugin.addSettingsModule({
    requires: PresenterSettings.requires,
    provides: PresenterSettings.provides,
    activate: PresenterSettings,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  Plugin.addLazyModule(MarkdownExtension),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default PresenterPlugin;
