//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { DeepSeekNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: DeepSeekNamespace.key,
    name: 'DeepSeek',
    author: 'DXOS',
    description: trim`
      DeepSeek registers a Connector for deepseek.com so the user can paste their DeepSeek API key.
      The key is stored as an AccessToken (source deepseek.com) plus a Connection in ECHO, resolvable by
      other plugins via CredentialsService. This plugin is headless - it contributes the connector only
      and has no UI surfaces.
    `,
    icon: { key: 'px--deepseek--regular', hue: 'blue' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-deepseek',
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'Connector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
