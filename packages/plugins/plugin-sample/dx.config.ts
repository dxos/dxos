//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { SampleNamespace } from './src/namespace.ts';
import * as SampleCapabilities from './src/types/SampleCapabilities.ts';

// Plugin definition — the main entry point for the plugin.
// `Plugin.config` takes the plugin's identity and its module list. Each module is authored via an
// `AppCapability.*` maker or `Capability.lazyModule`, declares what it requires, provides and
// activates on, and names its body with an `import(..., { with: { type: 'module-url' } })`: the
// build turns this file into a static manifest and each body into its own chunk.
// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SampleNamespace.key,
    name: 'Sample',
    author: 'DXOS',
    description: trim`
      Pedagogical reference plugin demonstrating all common DXOS plugin patterns
      in a single, well-commented package. The plugin manages a \`SampleItem\` ECHO
      type with \`name\`, \`description\`, and \`status\` fields, and exposes three
      operations: create, randomize, and update-status.

      The plugin illustrates the full plugin anatomy: ECHO schema definition with
      Effect/Schema annotations, typed operation definitions and handlers, app-graph
      extensions for section nodes and per-object actions, and multiple surface
      registrations covering Article, ObjectProperties, plugin settings, status bar,
      plank companion, and deck companion slots.

      Settings are persisted to local KVS via an atom and contributed to the global
      settings panel. A status-bar indicator demonstrates reactive capability
      subscriptions — it appears or disappears immediately when the user toggles the
      corresponding setting.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sample',
    icon: { key: 'ph--book-open--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    // Registers graph builder extensions (actions, connectors, companions).
    // Activates when the app graph builder capability can be resolved.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    // Registers type metadata for the framework's object system.
    // `createObject` is the factory called when users create this type via the UI.
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    // Registers operation handlers.
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    // Contributes the plugin's spec (`PLUGIN.mdl`) as an asset other tools can read.
    AppCapability.pluginAsset({
      pluginId: SampleNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    // Registers React surface contributions.
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        AppRole.Article,
        AppRole.deckCompanion('samplePanel'),
        AppRole.ObjectProperties,
        AppRole.Section,
        AppRole.StatusIndicator,
      ],
    }),
    // Registers the settings module.
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [SampleCapabilities.Settings],
    }),
    // Registers ECHO schemas so the framework knows about this type.
    // Required for queries, serialization, and type resolution.
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    // Registers i18n translations.
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
