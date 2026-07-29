//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { DrawingVariant, TldrawSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TldrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'drawing-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: DrawingVariant,
  }),
  AppPlugin.addSettingsModule({ activate: TldrawSettings }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TldrawPlugin;
