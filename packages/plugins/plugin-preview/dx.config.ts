//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import { trim } from '@dxos/util';

import { PreviewNamespace } from './src/namespace.ts';
import * as PreviewEvents from './src/PreviewEvents.ts';
import * as PreviewCapabilities from './src/types/PreviewCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: PreviewNamespace.key,
    name: 'Preview',
    author: 'DXOS',
    description: trim`
      Rich preview panel for viewing object content without opening full editors.
      Quick peek at documents, images, and data with inline rendering.
    `,
    icon: { key: 'ph--eye--regular' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-preview',
    tags: ['system'],
  },
  modules: [
    // Browser-only with the popover it serves: the resolver loads objects for a card no headless host renders.
    Capability.lazyModule(
      'LinkResolver',
      {
        provides: [PreviewCapabilities.LinkResolver],
        activatesOn: PreviewEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/link-resolver.ts', { with: { type: 'module-url' } }),
    ),
    // Browser-only: the module mounts the popover itself, so its body is React all the way down.
    Capability.lazyModule(
      'PreviewPopover',
      { provides: [], activatesOn: PreviewEvents.Start, environments: ['browser', 'tauri'] },
      () => import('./src/capabilities/preview-popover.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.CardContent, AppRole.CardIcon, AppRole.Article],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
