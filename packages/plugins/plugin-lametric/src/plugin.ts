//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { DashboardDriver, LaMetricSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const LaMetricPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(LaMetricSettings),
  Plugin.addModule(DashboardDriver),
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

export default LaMetricPlugin;
