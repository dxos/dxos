//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';
import * as AnimatorEvents from '@dxos/plugin-animator/AnimatorEvents';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import { trim } from '@dxos/util';

import { CanvasNamespace } from './src/namespace.ts';
import * as CanvasCapabilities from './src/types/CanvasCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CanvasNamespace.key,
    name: 'Canvas',
    author: 'DXOS',
    description: trim`
      An infinite, zoomable canvas of typed nodes and links at multiple depths.
      Renders a drawing as a scene graph: zoom into a portal to open its child scene.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-canvas',
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--graph--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      { dark: 'https://assets.composer.space/demos/2026-10-09-plugin-canvas.mp4?v=5b3598bd' },
      { dark: 'https://assets.composer.space/demos/2026-10-10-plugin-canvas-uml.mp4?v=b7c7aa13' },
    ],
    tags: ['beta'],
  },
  modules: [
    // The canvas as an animator stage, contributed when the animator starts; browser-only, as it renders.
    Capability.lazyModule(
      'animator-stage',
      {
        provides: [AnimatorCapabilities.Stage],
        activatesOn: AnimatorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/animator-stage.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: CanvasNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    // Browser-only: the variant supplies the React article that renders a drawing.
    Capability.lazyModule(
      'drawing-variant',
      {
        provides: [IllustratorCapabilities.VariantProvider],
        activatesOn: IllustratorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/drawing-variant.ts', { with: { type: 'module-url' } }),
    ),
    // Where the canvas variant is: a conversion to it needs the variant too.
    Capability.lazyModule(
      'tldraw-converter',
      {
        provides: [IllustratorCapabilities.Converter],
        activatesOn: IllustratorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/tldraw-converter.ts', { with: { type: 'module-url' } }),
    ),
    // Migration providers stay eager: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'CanvasMigrations',
      { provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    // Legacy scene drawings move onto `Canvas`es as each space loads, so no surface reads the legacy records.
    Capability.lazyModule(
      'legacy-migration',
      {
        requires: [ClientCapabilities.Client],
        provides: [],
        activatesOn: ClientEvents.SpacesAvailable,
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/legacy-migration.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri'] },
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [CanvasCapabilities.Settings],
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.objectProperties'],
    }),
    AppCapability.spaceTemplates(
      () => import('./src/capabilities/space-templates.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'translations',
      { provides: [AppCapabilities.Translations], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
