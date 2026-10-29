//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as StudioCapabilities from '@dxos/plugin-studio/StudioCapabilities';
import * as StudioEvents from '@dxos/plugin-studio/StudioEvents';
import { trim } from '@dxos/util';

import { HeyGenNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: HeyGenNamespace.key,
    name: 'HeyGen',
    author: 'DXOS',
    description: trim`
      HeyGen contributes a video-generation provider to Composer. It registers a Connector for
      heygen.com (an API-key credential form) so the user can connect their account, and implements the
      plugin-studio GenerationService capability (kind 'video') by calling the HeyGen HTTP API - an
      asynchronous job that is submitted then polled to completion. Avatar/voice ids are the
      kind-specific request config. The credential is resolved at generation time via CredentialsService.
      This plugin is headless - it contributes services only and has no UI surfaces.
    `,
    icon: { key: 'ph--circles-three--regular', hue: 'blue' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-heygen',
    dependsOn: ['org.dxos.plugin.studio'],
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'Connector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'GenerationService',
      { provides: [StudioCapabilities.GenerationService], activatesOn: StudioEvents.Start },
      () => import('./src/capabilities/generation-service.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
