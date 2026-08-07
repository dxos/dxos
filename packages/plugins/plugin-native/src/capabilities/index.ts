//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantEvents from '@dxos/plugin-assistant/AssistantEvents';

import * as NativeCapabilities from '../types/NativeCapabilities';
import * as NativeEvents from '../types/NativeEvents';

export const NativeSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [NativeCapabilities.Settings],
});
export const Ollama = Capability.lazyModule(
  'Ollama',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
    activatesOn: AssistantEvents.Start,
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
    // Settings carries the selected release channel, which the first check reads.
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker, NativeCapabilities.Settings],
    provides: [NativeCapabilities.UpdateManager],
    activatesOn: NativeEvents.Start,
  },
  () => import('./updater'),
);
