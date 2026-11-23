//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { SpotlightNamespace } from './src/namespace.ts';
import * as SpotlightCapabilities from './src/types/SpotlightCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: SpotlightNamespace.key,
    name: 'Spotlight',
    author: 'DXOS',
    description: trim`
      The Spotlight plugin drives the Tauri popover window that gives users instant keyboard
      access to Composer commands and navigation from anywhere on the desktop. It renders the
      commands dialog as its primary content inside a permanently-open, non-modal dialog so the
      underlying surface has the Radix context it requires.

      Layout operations that modify the main Composer window (Open, SwitchWorkspace) are
      intercepted and forwarded to the main window via Tauri inter-window events, then the
      spotlight panel is dismissed. Operations that are irrelevant in the popover context
      (UpdateSidebar, UpdatePopover, etc.) are silently ignored.

      The panel auto-dismisses when the window loses focus or the user presses Escape, and
      resets to the default commands dialog each time it regains focus. A short debounce on
      programmatic dismiss allows actions in the commands dialog to switch content before
      the window hides.

      The plugin is Tauri-only; all Tauri API calls are guarded by isTauri() so the module
      loads safely in browser-based test environments.
    `,
    spec: 'PLUGIN.mdl',
    icon: { key: 'ph--magnifying-glass--regular' },
    tags: ['system'],
  },
  modules: [
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: SpotlightNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.reactRoot(() => import('./src/capabilities/react-root.tsx', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'SpotlightDismiss',
      { provides: [] },
      () => import('./src/capabilities/spotlight-dismiss.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'State',
      {
        // App-shell state — same reason as the deck's `DeckState`: `SpotlightLayout` reads it on its
        // first render, so the shell cannot paint until this module has run.
        activatesOn: ActivationEvents.Startup,
        provides: [SpotlightCapabilities.State, AppCapabilities.Layout],
      },
      () => import('./src/capabilities/state.tsx', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
