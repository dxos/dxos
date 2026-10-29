//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { StorybookNamespace } from './src/namespace.ts';
import * as StorybookCapabilities from './src/types/StorybookCapabilities.ts';
import type { StorybookPluginOptions } from './src/types/StorybookPluginOptions.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<StorybookPluginOptions> = Plugin.config<StorybookPluginOptions>({
  plugin: {
    key: StorybookNamespace.key,
    name: 'Storybook',
    author: 'DXOS',
    description: trim`
      Development layout optimized for Storybook component testing and documentation.
      Provides specialized views for component development and design system exploration.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-testing',
    tags: ['labs'],
  },
  modules: [
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.reactContext(() => import('./src/capabilities/react-context.tsx', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'State',
      // Shell state read by `Layout` on its first render - same class as the deck's `DeckState`.
      { activatesOn: ActivationEvents.Startup, provides: [StorybookCapabilities.LayoutState, AppCapabilities.Layout] },
      () => import('./src/capabilities/state.tsx', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;

export type { StorybookPluginOptions } from './src/types/StorybookPluginOptions.ts';
