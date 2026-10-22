//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

import { meta } from '#meta';
import { translations } from '#translations';
import { Debug, DebugEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
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
  props: ({ logStore }: Debug.DebugPluginOptions) => ({ logStore }),
});
export const DebugSettings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [Debug.DebugCapabilities.Settings],
  environments: ['browser', 'node', 'tauri'],
});
export const GraphRetention = Capability.lazyModule(
  'GraphRetention',
  { provides: [AppCapabilities.AppGraphRetention] },
  () => import('./graph-retention.ts'),
);
export const StatsPanel = Capability.lazyModule(
  'StatsPanel',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.StatsPanel],
    props: ({ persistStats }: Debug.DebugPluginOptions) => ({ persist: persistStats ?? true }),
    activatesOn: DebugEvents.Start,
  },
  () => import('./stats-panel.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const MarkdownMenu = Capability.lazyModule(
  'MarkdownMenu',
  { provides: [MarkdownCapabilities.MenuExtension], activatesOn: DebugEvents.Start },
  () => import('./markdown-menu.ts'),
);
export const SpaceTemplates = AppCapability.spaceTemplates(() => import('./space-templates.ts'));
/** On their own because they are built from the client's EDGE and the toolchain the app was built from, not a static list. */
export const PluginTemplates = Capability.lazyModule(
  'PluginTemplates',
  {
    requires: [ClientCapabilities.Client],
    provides: [AppCapabilities.SpaceTemplate],
    activatesOn: ActivationEvents.SpaceTemplatesRequested,
    environments: ['browser'],
  },
  () => import('./plugin-templates.ts'),
);
export const LogRecording = Capability.lazyModule(
  'LogRecording',
  { provides: [], activatesOn: DebugEvents.Start },
  () => import('./log-recording.ts'),
);
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
