//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AssistantCapabilities } from '@dxos/plugin-assistant';

import { NativeCapabilities, NativeEvents } from '#types';

export const NativeSettings = AppCapability.settings(() => import('./settings'), {
  provides: [NativeCapabilities.Settings],
  activatesOn: NativeEvents.Start,
});
export const Ollama = Capability.lazyModule(
  'Ollama',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
    activatesOn: NativeEvents.Start,
  },
  () => import('./ollama'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: NativeEvents.Start,
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
