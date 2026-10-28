//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { trim } from '@dxos/util';

import { DeckNamespace } from './src/namespace.ts';
import * as DeckCapabilities from './src/types/DeckCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<DeckCapabilities.DeckPluginOptions> =
  Plugin.config<DeckCapabilities.DeckPluginOptions>({
    plugin: {
      key: DeckNamespace.key,
      name: 'Layout',
      author: 'DXOS',
      description: trim`
      The Deck plugin is the core layout engine for DXOS Composer. It manages the multi-plank
      workspace (the "deck"), sidebar panels, dialogs, popovers, and toast notifications, giving
      users a flexible, persistent workspace they can arrange to match their workflow.

      Subjects are opened as resizable "planks" arranged side by side; a single active plank renders
      fullbleed, and any plank can be toggled to a transient, headless fullscreen overlay. Users
      navigate with stack semantics — opening from a pivot truncates planks to the right and appends
      the new one — with a per-user setting controlling whether navigation replaces the current plank
      or opens a new one alongside it.

      Layout state (active planks, sidebar visibility, plank sizes, companion pane) is persisted
      across sessions via KVS/localStorage. URL routing is handled by the plugin so that any
      workspace configuration can be bookmarked or shared as a deep link.

      All layout changes are expressed through typed LayoutOperations (Open, Close, Set, UpdateSidebar,
      UpdateDialog, UpdatePopover, etc.) that any plugin in the system can dispatch, keeping the layout
      logic centralised and easy to extend.
    `,
      icon: { key: 'ph--layout--regular' },
      spec: 'PLUGIN.mdl',
      tags: ['system'],
    },
    modules: [
      AppCapability.appGraphBuilder(
        () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'CheckAppScheme',
        {
          requires: [DeckCapabilities.Settings, Capabilities.OperationInvoker, AppCapabilities.NavigationHandler],
          provides: [],
        },
        () => import('./src/capabilities/check-app-scheme.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
        provides: [DeckCapabilities.Settings],
      }),
      Capability.lazyModule(
        'DeckState',
        {
          // App-shell state, so it belongs on the startup pass rather than the idle default: the deck
          // root and `DeckLayout` read it on their FIRST render, and the shell cannot paint without it.
          // The gate belongs here, on the provider — declaring it as the reader's `requires` instead
          // demotes the reader into this module's wave rather than promoting this module.
          activatesOn: ActivationEvents.Startup,
          requires: [Capabilities.AtomRegistry],
          provides: [
            DeckCapabilities.State,
            DeckCapabilities.EphemeralState,
            AppCapabilities.Layout,
            DeckCapabilities.Platform,
            DeckCapabilities.Projection,
          ],
        },
        () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'GraphRetention',
        {
          requires: [DeckCapabilities.State, AppCapabilities.Layout],
          provides: [AppCapabilities.AppGraphRetention],
        },
        () => import('./src/capabilities/graph-retention.ts', { with: { type: 'module-url' } }),
      ),
      Capability.lazyModule(
        'NotificationTracker',
        {
          requires: [
            Capabilities.AtomRegistry,
            DeckCapabilities.EphemeralState,
            Capabilities.ProcessManager,
            Capabilities.PluginManager,
            Capabilities.OperationInvoker,
            Capabilities.OperationHandler,
          ],
          provides: [],
        },
        () => import('./src/capabilities/notification-tracker.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.operationHandler(
        () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      ),
      AppCapability.pluginAsset({
        pluginId: DeckNamespace.key,
        path: 'PLUGIN.mdl',
        content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
        mimeType: 'application/x-mdl',
      }),
      AppCapability.reactRoot(() => import('./src/capabilities/react-root.tsx', { with: { type: 'module-url' } })),
      AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
        roles: ['org.dxos.role.article'],
      }),
      AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
      Capability.lazyModule(
        'UrlHandler',
        {
          // Boot-time URL restore: this installs the popstate listener and the URL<->state sync, so an
          // idle registration leaves a deep link unhandled for the window it takes to get there.
          activatesOn: ActivationEvents.Startup,
          requires: [
            Capabilities.OperationInvoker,
            AppCapabilities.NavigationHandler,
            AppCapabilities.NavigationTargetLoader,
            Capabilities.AtomRegistry,
            DeckCapabilities.State,
            DeckCapabilities.EphemeralState,
            DeckCapabilities.Settings,
            AppCapabilities.AppGraph,
            AttentionCapabilities.ViewState,
            AttentionCapabilities.Attention,
          ],
          provides: [],
        },
        () => import('./src/capabilities/url-handler.ts', { with: { type: 'module-url' } }),
      ),
    ],
  });

export const { meta, make } = config;

export default config;
