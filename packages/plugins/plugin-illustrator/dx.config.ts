//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { IllustratorNamespace } from './src/namespace.ts';
import * as IllustratorCapabilities from './src/types/IllustratorCapabilities.ts';
import * as IllustratorEvents from './src/types/IllustratorEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: IllustratorNamespace.key,
    name: 'Illustrator',
    author: 'DXOS',
    description: trim`
      Headless diagramming host plugin that provides shared infrastructure for local-first
      drawing and diagramming inside DXOS Composer. The plugin owns the base \`Sketch\` ECHO
      type — a named handle referencing a renderer-specific canvas object — together with the
      renderer-neutral scene DSL, the diagram dialect registry, and the agent-facing sketch
      skill and operations (create, read, edit).

      Canvas renderers (tldraw, excalidraw, and others) are contributed by separate plugins
      via the \`IllustratorCapabilities.VariantProvider\` capability. Each variant supplies its
      own canvas schema, a builder that maps the scene DSL onto its records, and surface
      components (Article and Card). Plugin-illustrator resolves the correct variant at
      runtime and delegates rendering and DSL compilation, keeping the host layer fully
      decoupled from renderer internals.

      Canvas objects are stored as hidden ECHO objects alongside the top-level \`Sketch\`,
      ensuring they replicate to all peers but do not appear as independent items in the
      user's space graph.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-illustrator',
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      {
        dark: 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-08-27-qa-flows/plugin-illustrator-QA-1.webm',
      },
    ],
    tags: ['alpha'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.commands(() => import('./src/capabilities/commands.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
    }),
    AppCapability.commentConfig(
      () => import('./src/capabilities/comment-config.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: IllustratorEvents.Start,
      },
    ),
    // Browser-only: the entry supplies `CreateDrawingPanel`, the React form that picks the drawing
    // variant and collects its input.
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    // Migration providers stay eager: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'IllustratorMigrations',
      { provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.pluginAsset({
      pluginId: IllustratorNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.section', 'org.dxos.role.slide'],
    }),
    Capability.lazyModule(
      'RefitState',
      { provides: [IllustratorCapabilities.Refit], activatesOn: ActivationEvents.Startup },
      () => import('./src/capabilities/refit-state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'IllustratorSvgVariant',
      {
        provides: [IllustratorCapabilities.VariantProvider],
        activatesOn: ActivationEvent.oneOf(IllustratorEvents.Start, AppActivationEvents.AssistantStart),
      },
      () => import('#svg-variant', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
