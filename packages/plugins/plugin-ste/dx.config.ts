//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { SteNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SteNamespace.key,
    name: 'Simplified Technical English',
    author: 'DXOS',
    description: trim`
      An assistant skill that writes and rewrites technical text in Simplified Technical English (ASD-STE100),
      with a check tool that finds violations of the writing rules and words outside the approved word list.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-ste',
    icon: { key: 'ph--text-aa--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'assistant'],
  },
  modules: [
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
  ],
});

export const { meta, make } = config;

export default config;
