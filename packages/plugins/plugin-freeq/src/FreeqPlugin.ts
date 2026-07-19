//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { ChannelBackend } from '#capabilities';
import { meta } from '#meta';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';
import { translations } from './translations';
import { FreeqChannel } from './types';

export const FreeqPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(AppCapability.schema([FreeqChannel])),
  // Single module contributes both the connection manager and the channel backend
  // (see channel-backend.ts) — same-wave modules cannot `waitFor` each other's contributions.
  Plugin.addLazyModule(ChannelBackend),
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

export default FreeqPlugin;
