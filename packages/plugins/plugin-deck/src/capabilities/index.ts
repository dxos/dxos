//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { meta } from '#meta';
import { translations } from '#translations';
import { DeckCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const CheckAppScheme = Capability.lazyModule(
  'CheckAppScheme',
  {
    requires: [DeckCapabilities.Settings, Capabilities.OperationInvoker, AppCapabilities.NavigationHandler],
    provides: [],
  },
  () => import('./check-app-scheme.ts'),
);
export const NotificationTracker = Capability.lazyModule(
  'NotificationTracker',
  {
    requires: [
      Capabilities.AtomRegistry,
      DeckCapabilities.EphemeralState,
      Capabilities.ProcessMonitor,
      Capabilities.PluginManager,
      Capabilities.OperationInvoker,
      Capabilities.OperationHandler,
    ],
    provides: [],
  },
  () => import('./notification-tracker.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root.tsx'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});
export const DeckSettings = AppCapability.settings(() => import('./settings.ts'), {
  provides: [DeckCapabilities.Settings],
});
export const DeckState = Capability.lazyModule(
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
    ],
  },
  () => import('./state.ts'),
);
export const Translations = AppCapability.translations(translations);
export const UrlHandler = Capability.lazyModule(
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
  () => import('./url-handler.ts'),
);
