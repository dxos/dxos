//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import { trim } from '@dxos/util';

import { NativeNamespace } from './src/namespace.ts';
import { type NativeOptions } from './src/settings-store.ts';
import * as NativeCapabilities from './src/types/NativeCapabilities.ts';
import * as NativeEvents from './src/types/NativeEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<NativeOptions> = Plugin.config<NativeOptions>({
  plugin: {
    key: NativeNamespace.key,
    name: 'App',
    author: 'DXOS',
    description: trim`
      Tauri-based native platform integration for DXOS Composer on macOS, Linux, and Windows.

      Provides Spotlight window integration that forwards spotlight:invoke Tauri events to
      Composer operations, letting the OS-level launcher open spaces and switch workspaces
      without the main window being focused first.

      Manages over-the-air application updates via the Tauri updater plugin, automatically
      checking for new releases in the background, streaming download progress, and surfacing
      a toast notification with a one-click Relaunch action when an update is ready. With
      "Update automatically" on, it installs an update while the app starts and relaunches.

      Spawns the bundled Ollama process on localhost for local AI model inference, registering
      it as an AiModelResolver so Assistant features can resolve model requests without any
      external server dependency.
    `,
    spec: 'PLUGIN.mdl',
    icon: { key: 'ph--app-window--regular' },
    tags: ['system'],
  },
  modules: [
    Capability.lazyModule(
      'ExitGuard',
      { requires: [Capabilities.OperationInvoker], provides: [], activatesOn: NativeEvents.Start },
      () => import('./src/capabilities/exit-guard.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [NativeCapabilities.Settings],
    }),
    // Startup, not `AssistantEvents.Start`: `AiService` snapshots its multi-arity `AiModelResolver`
    // require once during startup, so the sidecar resolver contributed in a later round is invisible to
    // it and every `built-in` model fails to resolve. Activation stays cheap — it builds the manager and
    // a lazy layer; the sidecar process spawns on first use, not here.
    Capability.lazyModule(
      'Ollama',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
        activatesOn: ActivationEvents.Startup,
      },
      () => import('./src/capabilities/ollama.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: NativeNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article],
    }),
    Capability.lazyModule(
      'SpotlightListener',
      { requires: [Capabilities.OperationInvoker], provides: [], activatesOn: NativeEvents.Start },
      () => import('./src/capabilities/spotlight-listener.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'BootGate',
      {
        activatesOn: ActivationEvents.Startup,
        requires: [Capabilities.AtomRegistry, NativeCapabilities.UpdateManager],
        provides: [Capabilities.BootGate],
      },
      () => import('./src/capabilities/boot-gate.ts', { with: { type: 'module-url' } }),
    ),
    // Startup: `BootGate` requires this, and the startup pass activates only startup modules.
    Capability.lazyModule(
      'Updater',
      {
        requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker],
        provides: [NativeCapabilities.UpdateManager],
        activatesOn: ActivationEvents.Startup,
      },
      () => import('./src/capabilities/updater.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
