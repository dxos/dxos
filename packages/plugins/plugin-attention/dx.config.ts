//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { AttentionNamespace } from './src/namespace.ts';
import * as AttentionCapabilities from './src/types/AttentionCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: AttentionNamespace.key,
    name: 'Attention',
    author: 'DXOS',
    description: trim`
      Track and manage focused attention on objects across your workspace.
      Highlight items requiring action and coordinate team focus on priority work.
    `,
    tags: ['system'],
  },
  modules: [
    Capability.lazyModule(
      'attention',
      {
        // App-shell state, so it must be on the startup pass rather than the idle default: the deck
        // and its planks read it through the STRICT `useCapability` hooks during their first render,
        // where a missing capability is an invariant violation and not a late-arriving value.
        activatesOn: ActivationEvents.Startup,
        requires: [Capabilities.AtomRegistry],
        provides: [AttentionCapabilities.Attention, AttentionCapabilities.ViewState],
      },
      () => import('./src/capabilities/attention.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Keyboard',
      { requires: [AppCapabilities.AppGraph, AttentionCapabilities.Attention], provides: [] },
      () => import('./src/capabilities/keyboard.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.reactContext(() => import('./src/capabilities/react-context.tsx', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
