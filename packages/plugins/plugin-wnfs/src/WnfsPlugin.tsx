//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { BlobBackend, Dependencies } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const WnfsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(Dependencies),
  Plugin.addModule(BlobBackend),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default WnfsPlugin;
