//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { trim } from '@dxos/util';

import { DebugNamespace } from './src/namespace.ts';
import * as Debug from './src/types/Debug.ts';
import * as DebugEvents from './src/types/DebugEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<Debug.DebugPluginOptions> = Plugin.config<Debug.DebugPluginOptions>({
  plugin: {
    key: DebugNamespace.key,
    name: 'Debug',
    author: 'DXOS',
    description: trim`
      DebugPlugin bundles developer debugging utilities for DXOS Composer in a floating debug panel
      opened from the status bar: a navtree over a hidden debug category of the app graph, with the
      console, the log viewer, the Devtools inspector, and the tools below as its pages.

      Test-data generation is available via a SpaceGenerator article surface: developers can
      create configurable batches of synthetic ECHO objects into any space collection, with a
      status indicator showing when generation is running.

      The plugin contributes a Debug companion tab to every ECHO object in the deck so developers
      can inspect raw field values and DXNs inline, and a Space Objects companion panel that lists
      all objects in the active space with live reactive updates.

      Additional utilities include a wireframe overlay mode that draws labelled borders around
      every article and section surface, a log-capture and download facility backed by an
      IdbLogStore, and a transient-stats panel for live telemetry.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-debug',
    icon: { key: 'ph--bug--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    Capability.lazyModule(
      'SampleMailSend',
      { provides: [InboxCapabilities.MailSendOperation], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/sample-mail-send.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [Debug.DebugCapabilities.Settings],
      environments: ['browser', 'node', 'tauri'],
    }),
    Capability.lazyModule(
      'GraphRetention',
      { provides: [AppCapabilities.AppGraphRetention] },
      () => import('./src/capabilities/graph-retention.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'LogRecording',
      { provides: [], activatesOn: DebugEvents.Start },
      () => import('./src/capabilities/log-recording.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'MarkdownMenu',
      { provides: [MarkdownCapabilities.MenuExtension], activatesOn: DebugEvents.Start },
      () => import('./src/capabilities/markdown-menu.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: DebugNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.plugin.debug.surface.page',
        'org.dxos.plugin.debug.surface.stats',
        'org.dxos.role.article',
        'org.dxos.role.deckCompanion.spaceObjects',
        'org.dxos.role.devtoolsOverview',
        'org.dxos.role.drawer',
        'org.dxos.role.section',
        'org.dxos.role.statusIndicator',
      ],
      requires: [Capabilities.AtomRegistry, Debug.DebugCapabilities.Settings, AppCapabilities.FileUploader],
    }),
    AppCapability.spaceTemplates(
      () => import('./src/capabilities/space-templates.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'StatsPanel',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [AppCapabilities.StatsPanel],
        activatesOn: DebugEvents.Start,
      },
      () => import('./src/capabilities/stats-panel.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
