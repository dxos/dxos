//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

/** A plugin Composer loads by URL in the remote-plugin e2e spec: one operation, in a module body of its own. */
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: 'org.dxos.plugin.e2eRemote',
    name: 'E2E remote plugin',
    description: 'Loaded from its manifest.json by the composer-e2e remote-plugin spec.',
  },
  modules: [
    AppCapability.operationHandler(() => import('./src/operation-handler.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
