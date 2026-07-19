//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const TransformerPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([])),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({ pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' }),
  ),
  Plugin.make,
);

export default TransformerPlugin;
