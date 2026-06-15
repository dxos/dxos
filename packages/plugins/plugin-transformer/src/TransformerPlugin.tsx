//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

// import { IntentResolver } from './capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TransformerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSchemaModule({ schema: [] }),
  AppPlugin.addTranslationsModule({ translations }),
  // Plugin.addModule({
  //   id: 'intent-resolver',
  //   activatesOn: Events.SetupIntentResolver,
  //   activate: IntentResolver,
  // }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default TransformerPlugin;
