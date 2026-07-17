//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { RoutineCapabilities } from '@dxos/plugin-routine';
import { SpaceCapabilities } from '@dxos/plugin-space';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [AttentionCapabilities.ViewState], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const RoutineTemplates = Capability.lazyModule(
  'RoutineTemplates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./routine-templates'),
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
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  { requires: [ClientCapabilities.Client], provides: [AppCapabilities.NavigationPathResolver] },
  () => import('./navigation-resolver'),
);
