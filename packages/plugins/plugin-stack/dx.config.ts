//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import { trim } from '@dxos/util';

import { StackNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: StackNamespace.key,
    name: 'Stacks',
    author: 'DXOS',
    description: trim`
      The Stack plugin renders any Collection as a vertically scrollable stack of collapsible sections in the
      Composer article surface. Each section wraps an arbitrary ECHO object and delegates its content rendering
      to the section surface role, enabling any other plugin to contribute its own section renderer.

      Sections can be individually collapsed to show only their title, expanded to reveal full content, navigated
      to directly, or removed from the collection. New sections can be inserted before or after any existing
      section via a per-section dropdown menu, or appended via the toolbar Add button.

      The plugin registers StackViewType with the ECHO schema module so that per-section view metadata
      (height overrides, custom display data) can be stored and replicated alongside the collection.

      A settings panel exposes a separation toggle that controls whether visual dividers are rendered between
      sections.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stack',
    icon: { key: 'ph--stack-simple--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
  },
  modules: [
    AppCapability.pluginAsset({
      pluginId: StackNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
