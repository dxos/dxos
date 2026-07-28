//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { SketchVariant, TldrawSettings } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Tldraw } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TldrawPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'sketch-variant',
    activatesOn: AppActivationEvents.SetupSchema,
    activate: SketchVariant,
  }),
  AppPlugin.addSchemaModule({ schema: [Tldraw.Canvas] }),
  AppPlugin.addSettingsModule({ activate: TldrawSettings }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TldrawPlugin;
