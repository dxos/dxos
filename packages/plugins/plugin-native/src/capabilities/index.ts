//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import { NativeCapabilities, NativeEvents } from '#types';

export const NativeSettings = AppCapability.settings(() => import('./settings'), {
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
  () => import('./ollama'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const SpotlightListener = Capability.lazyModule(
  'SpotlightListener',
  { requires: [Capabilities.OperationInvoker], provides: [], activatesOn: NativeEvents.Start },
  () => import('./spotlight-listener'),
);
export const Updater = Capability.lazyModule(
  'Updater',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker],
    provides: [NativeCapabilities.UpdateManager],
    activatesOn: NativeEvents.Start,
  },
  () => import('./updater'),
);
