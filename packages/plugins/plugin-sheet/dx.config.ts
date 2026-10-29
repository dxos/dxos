//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { SheetNamespace } from './src/namespace.ts';
import * as SheetCapabilities from './src/types/SheetCapabilities.ts';
import * as SheetEvents from './src/types/SheetEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SheetNamespace.key,
    name: 'Sheet',
    author: 'DXOS',
    description: trim`
      Full-featured spreadsheet for DXOS Composer backed by ECHO for local-first, real-time collaborative editing.
      Cells, row/column metadata, and range-based formatting are all stored as ECHO objects and replicated to peers instantly.

      Formula evaluation is powered by HyperFormula, providing over 400 built-in functions covering arithmetic, statistics,
      text manipulation, date/time, financial, and logical operations. Formulas are stored with internal cell indices and
      translated to A1-notation on display, keeping references stable across row and column insertions.

      The plugin integrates with plugin-markdown to expose formula results inside document fenced code blocks, and
      contributes anchor-navigation support so other plugins can scroll and highlight specific cell ranges by DXN reference.
      AI agents can invoke sheet operations — insert/drop axes, scroll to anchor, and read or write cell values — through
      the standard operations framework.
    `,
    icon: { key: 'ph--grid-nine--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sheet',
    spec: 'PLUGIN.mdl',
    screenshots: [
      { dark: 'https://media.dxos.network/plugin-details-sheet-dark.png' },
      { dark: 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-08-27-qa-flows/plugin-sheet-QA-1.webm' },
      { dark: 'https://assets.composer.space/demos/2026-10-09-plugin-sheet.mp4?v=f7e67bab' },
      { light: 'https://assets.composer.space/demos/2026-10-16-plugin-sheet.mp4?v=bc00ceef' },
    ],
    tags: ['alpha'],
  },
  modules: [
    AppCapability.anchorSort(() => import('./src/capabilities/anchor-sort.ts', { with: { type: 'module-url' } }), {
      requires: [AppCapabilities.AppGraph],
      activatesOn: SheetEvents.Start,
    }),
    // Ordering-only: registers the sort comparator once the app graph exists; the body reads
    // nothing else.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.commentConfig(
      () => import('./src/capabilities/comment-config.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: SheetEvents.Start,
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'ComputeGraphRegistry',
      {
        // Headless: formulas evaluate in a markdown document with no sheet surface ever rendered, so
        // gating this on the sheet's own start conflates "the sheet UI is on screen" with "compute
        // graphs exist". Ungated (hence idle) it also becomes pullable by the consumers that need it
        // earlier, which a start-gated provider is not.
        requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
        provides: [SheetCapabilities.ComputeGraphRegistry],
        // Needs a client, which headless hosts (EDGE) do not provide.
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/compute-graph-registry.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'MarkdownExtension',
      {
        // The provider callbacks read the registry, so it must be in place when this activates.
        requires: [SheetCapabilities.ComputeGraphRegistry],
        provides: [MarkdownCapabilities.ExtensionProvider],
        activatesOn: MarkdownEvents.Start,
        // Follows its required registry, which headless hosts (EDGE) do not provide.
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    // Migration providers stay eager: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'SheetMigrations',
      { environments: ['browser', 'node', 'tauri', 'workerd'], provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri', 'workerd'], activatesOn: ActivationEvents.Idle },
    ),
    AppCapability.pluginAsset({
      pluginId: SheetNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.role.article',
        'org.dxos.role.objectProperties',
        'org.dxos.role.section',
        'org.dxos.role.slide',
      ],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
    Capability.lazyModule(
      'SheetState',
      { provides: [SheetCapabilities.GridInstances], activatesOn: SheetEvents.Start },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      { environments: ['browser', 'node', 'tauri', 'workerd'] },
    ),
    AppCapability.spaceTemplates(
      () => import('./src/capabilities/space-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri', 'workerd'],
    }),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } }), {
      activatesOn: SheetEvents.Start,
      environments: ['browser', 'node', 'tauri'],
    }),
  ],
});

export const { meta, make } = config;

export default config;
