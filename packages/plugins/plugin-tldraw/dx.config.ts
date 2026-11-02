//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import { trim } from '@dxos/util';

import { TldrawNamespace } from './src/namespace.ts';
import * as TldrawCapabilities from './src/types/TldrawCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: TldrawNamespace.key,
    name: 'tldraw',
    author: 'DXOS',
    description: trim`
      tldraw is the canvas renderer that powers collaborative whiteboards in DXOS Composer,
      giving every workspace a full-featured infinite canvas. Draw freehand strokes, place
      geometric shapes, add text and arrows, and organise ideas visually — all within the same
      local-first environment as the rest of your documents.

      The plugin contributes a sketch variant to the Illustrator plugin: the base \`Sketch\`
      object references a tldraw Canvas whose content is stored as a plain JSON record in ECHO,
      so no binary blobs or external storage are required. Toolbar actions, grid settings, and
      custom tools are wired through the Composer plugin system, and a builder maps the
      Illustrator scene DSL onto tldraw records so agents can draw and edit diagrams.

      Because Canvas data lives in ECHO, every edit is replicated peer-to-peer in real time.
      Collaborators see each other's strokes as they draw, and changes made offline merge
      automatically when connectivity is restored using ECHO's CRDT semantics.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tldraw',
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
    screenshots: [{ dark: 'https://media.dxos.network/plugin-details-sketch-dark.png' }],
  },
  modules: [
    // Browser-only: the variant supplies the React article/card components that render a drawing.
    Capability.lazyModule(
      'drawing-variant',
      {
        provides: [IllustratorCapabilities.VariantProvider],
        activatesOn: IllustratorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/drawing-variant.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'plugin-asset',
      {
        activatesOn: ActivationEvents.PluginAssetsRequested,
        provides: [AppCapabilities.PluginAsset],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/plugin-asset.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [TldrawCapabilities.Settings],
    }),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
