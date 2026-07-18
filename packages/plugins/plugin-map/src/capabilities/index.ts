//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation, OperationHandlerSet, Skill } from '@dxos/compute';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { MapCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [MapCapabilities.MarkerProvider], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
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
export const MapSettings = Capability.lazyModule(
  'MapSettings',
  { provides: [MapCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const MapState = Capability.lazyModule(
  'MapState',
  { provides: [MapCapabilities.State] },
  () => import('./state'),
);
