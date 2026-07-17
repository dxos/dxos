//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { ScriptCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
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
// Runtime event: the compiler is only loaded on demand (see `hooks/useCompiler.ts`), not at startup.
export const Compiler = Capability.lazyModule(
  'Compiler',
  { provides: [ScriptCapabilities.Compiler] },
  () => import('./compiler'),
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
export const ScriptSettings = Capability.lazyModule(
  'ScriptSettings',
  { provides: [ScriptCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
