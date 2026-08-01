//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AssistantCapabilities } from '@dxos/plugin-assistant';

import { NativeCapabilities } from '#types';

export const NativeSettings = AppCapability.settings(() => import('./settings'), {
  provides: [NativeCapabilities.Settings],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const Ollama = Capability.lazyModule(
  'Ollama',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./ollama'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const SpotlightListener = Capability.lazyModule(
  'SpotlightListener',
  { requires: [Capabilities.OperationInvoker], provides: [], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./spotlight-listener'),
);
export const Updater = Capability.lazyModule(
  'Updater',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker],
    provides: [NativeCapabilities.UpdateManager],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./updater'),
);
