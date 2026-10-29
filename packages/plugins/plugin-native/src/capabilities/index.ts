//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import { meta } from '#meta';
import { translations } from '#translations';
import { NativeCapabilities, NativeEvents } from '#types';

export const ExitGuard = Capability.lazyModule(
  'ExitGuard',
  { requires: [Capabilities.OperationInvoker], provides: [], activatesOn: NativeEvents.Start },
  () => import('./exit-guard.ts'),
);
export const LocalNotifier = Capability.lazyModule(
  'LocalNotifier',
  { provides: [AppCapabilities.LocalNotifier], activatesOn: NativeEvents.Start },
  () => import('./local-notifier.ts'),
);
export const NativeSettings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [NativeCapabilities.Settings],
});
// Startup, not `AssistantEvents.Start`: `AiService` snapshots its multi-arity `AiModelResolver`
// require once during startup, so the sidecar resolver contributed in a later round is invisible to
// it and every `built-in` model fails to resolve. Activation stays cheap — it builds the manager and
// a lazy layer; the sidecar process spawns on first use, not here.
export const Ollama = Capability.lazyModule(
  'Ollama',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
    activatesOn: ActivationEvents.Startup,
  },
  () => import('./ollama.ts'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});
export const SpotlightListener = Capability.lazyModule(
  'SpotlightListener',
  { requires: [Capabilities.OperationInvoker], provides: [], activatesOn: NativeEvents.Start },
  () => import('./spotlight-listener.ts'),
);
export const Translations = AppCapability.translations(translations);
export const Updater = Capability.lazyModule(
  'Updater',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker],
    provides: [NativeCapabilities.UpdateManager],
    activatesOn: NativeEvents.Start,
  },
  () => import('./updater.ts'),
);
