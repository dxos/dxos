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

import { HiggsfieldNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: HiggsfieldNamespace.key,
    name: 'Higgsfield',
    author: 'DXOS',
    description: trim`
      Higgsfield contributes image and video generation providers to Composer. It registers a Connector
      for higgsfield.ai (an API key id + secret credential form) so the user can connect their Higgsfield
      Cloud account, and implements the plugin-studio GenerationService capability for kinds 'image' and
      'video' by calling the Higgsfield HTTP API — an asynchronous request that is submitted to a model
      endpoint then polled to completion. The model path is the kind-specific request config. The
      credential is resolved at generation time via CredentialsService. This plugin is headless — it
      contributes services only and has no UI surfaces.
    `,
    icon: { key: 'ph--scribble-loop--regular', hue: 'lime' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-higgsfield',
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
