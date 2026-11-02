//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { trim } from '@dxos/util';

import { FileSystemNamespace } from './src/namespace.ts';
import * as FileSystemCapabilities from './src/types/FileSystemCapabilities.ts';
import * as FileSystemEvents from './src/types/FileSystemEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: FileSystemNamespace.key,
    name: 'FileSystem',
    author: 'DXOS',
    description: trim`
      Open local directories as workspaces inside the Composer desktop app, similar to an Obsidian vault.
      Markdown files and sub-directories are surfaced in the navtree alongside ECHO spaces and objects,
      and edits made in Composer are written back to disk in real time.
      Workspaces can be opened, closed, and refreshed via the app graph action menu;
      ordering is persisted in the user's personal ECHO space so the layout survives restarts.
      Requires the Electron-based Composer desktop app — not available in browser builds.
    `,
    icon: { key: 'ph--folder-open--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [Capabilities.AtomRegistry, FileSystemCapabilities.State],
      },
    ),
    Capability.lazyModule(
      'MarkdownExtension',
      {
        environments: ['browser', 'tauri'],
        // `State` is declared alongside the manager because the provider callbacks read it and it is
        // contributed by this plugin's own idle-gated module, which markdown start can otherwise precede.
        requires: [FileSystemCapabilities.FileSystemManager, FileSystemCapabilities.State],
        provides: [MarkdownCapabilities.ExtensionProvider],
        activatesOn: MarkdownEvents.Start,
      },
      () => import('./src/capabilities/markdown-extension.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: FileSystemNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      requires: [FileSystemCapabilities.State],
      roles: ['org.dxos.role.article'],
    }),
    Capability.lazyModule(
      'State',
      {
        environments: ['browser', 'tauri'],
        requires: [Capabilities.AtomRegistry, ClientCapabilities.Client],
        provides: [FileSystemCapabilities.State, FileSystemCapabilities.FileSystemManager],
        activatesOn: FileSystemEvents.Start,
      },
      () => import('./src/capabilities/state/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
