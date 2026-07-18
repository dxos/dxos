//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { MapCapabilities } from '@dxos/plugin-map/types';
import { SpaceCapabilities } from '@dxos/plugin-space';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [AttentionCapabilities.ViewState], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export { default as SkillDefinition } from './skill-definition';
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const MarkerProvider = Capability.lazyModule(
  'MarkerProvider',
  { provides: [MapCapabilities.MarkerProvider] },
  () => import('./marker-provider'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const Settings = Capability.lazyModule(
  'Settings',
  { requires: [Capabilities.AtomRegistry], provides: [AppCapabilities.Settings] },
  () => import('./settings'),
);
