//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ChannelBackend, PluginAsset, Schema, Translations } from '#capabilities';
import { meta } from '#meta';

export const FreeqPlugin = Plugin.define(meta).pipe(
  // Single module contributes both the connection manager and the channel backend
  // (see channel-backend.ts) — same-wave modules cannot `waitFor` each other's contributions.
  Plugin.addModule(ChannelBackend),
  Plugin.addModule(PluginAsset),
  Plugin.addModule(Schema),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default FreeqPlugin;
