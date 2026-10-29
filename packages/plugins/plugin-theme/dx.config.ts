//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { ThemeNamespace } from './src/namespace.ts';
import { type ThemePluginOptions } from './src/react-context.tsx';
import * as ThemeCapabilities from './src/types/ThemeCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<ThemePluginOptions> = Plugin.config<ThemePluginOptions>({
  plugin: {
    key: ThemeNamespace.key,
    name: 'Theme',
    author: 'DXOS',
    description: trim`
      Core theming engine providing consistent visual styling across the workspace.
      Switch between light and dark modes and apply custom theme configurations.
    `,
    icon: { key: 'ph--palette--regular', hue: 'pink' },
    tags: ['system'],
  },
  modules: [
    AppCapability.reactContext(() => import('./src/react-context.tsx', { with: { type: 'module-url' } }), {
      requires: [Capabilities.AtomRegistry, ThemeCapabilities.Settings],
    }),
    AppCapability.settings(() => import('./src/settings.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
      provides: [ThemeCapabilities.Settings],
    }),
    Capability.lazyModule(
      'Translator',
      {
        environments: ['browser', 'node', 'tauri'],
        requires: [Capabilities.AtomRegistry, AppCapabilities.Translations],
        provides: [AppCapabilities.Translator],
      },
      () => import('./src/translator.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
