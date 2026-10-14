//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AppGraphBuilder, BridgeDriver, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const StreamDeckPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(BridgeDriver),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: () => import('../PLUGIN.mdl?raw'),
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default StreamDeckPlugin;
