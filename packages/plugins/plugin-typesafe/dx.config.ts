//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { TypeSafeNamespace } from './src/namespace.ts';
import * as TypeSafeCapabilities from './src/types/TypeSafeCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TypeSafeNamespace.key,
    name: 'TypeSafe',
    author: 'DXOS',
    description: trim`
      TypeSafe registers a Connector for typesafe.ai so the user can paste their System One API key,
      and contributes the model resolver that serves TypeSafe decision models through AiService in
      every space. The model answers typed questions about a state (probability / classify / rate)
      rather than generating text, so a plugin can classify with decisions instead of a prompt.
      Headless: no UI surfaces.
    `,
    icon: { key: 'ph--scales--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-typesafe',
    tags: ['labs', 'connector'],
  },
  modules: [
    Capability.lazyModule(
      'Connector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    // Startup, not later: `AiService` snapshots its `AiModelResolver` contributions once during startup,
    // so a resolver contributed in a later round is invisible to it.
    Capability.lazyModule(
      'ModelResolver',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [AppCapabilities.AiModelResolver],
        activatesOn: ActivationEvents.Startup,
      },
      () => import('./src/capabilities/model-resolver.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [TypeSafeCapabilities.Settings],
    }),
  ],
});

export const { meta, make } = config;

export default config;
