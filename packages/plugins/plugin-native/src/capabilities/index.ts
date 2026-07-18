//
// Copyright 2025 DXOS.org
//

// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { AiModelResolver } from '@dxos/ai';
import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Ollama as OllamaTypes } from '@dxos/plugin-assistant';
import { AssistantCapabilities } from '@dxos/plugin-assistant';

import { NativeCapabilities } from '#types';

export const NativeSettings = Capability.lazyModule(
  'NativeSettings',
  { provides: [NativeCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const Ollama = Capability.lazyModule(
  'Ollama',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [AppCapabilities.AiModelResolver, AssistantCapabilities.OllamaManager],
  },
  () => import('./ollama'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
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
