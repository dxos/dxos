//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AssistantCapabilities } from '@dxos/plugin-assistant';

import { NativeCapabilities } from '#types';

export const NativeSettings = AppCapability.settings(() => import('./settings'), {
  provides: [NativeCapabilities.Settings],
});
export const Ollama = Capability.lazyModule(
  'Ollama',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
  },
  () => import('./ollama'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const SpotlightListener = Capability.lazyModule(
  'SpotlightListener',
  { requires: [Capabilities.OperationInvoker], provides: [] },
  () => import('./spotlight-listener'),
);
export const Updater = Capability.lazyModule(
  'Updater',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker],
    provides: [NativeCapabilities.UpdateManager],
  },
  () => import('./updater'),
);
