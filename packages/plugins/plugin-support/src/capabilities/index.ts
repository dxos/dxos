//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { HelpCapabilities, SupportCapabilities, type Tour } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { requires: [SupportCapabilities.Settings], provides: [AppCapabilities.AppGraphBuilder] },
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
export const HelpState = Capability.lazyModule(
  'HelpState',
  { provides: [HelpCapabilities.State] },
  () => import('./help-state'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactRoot = Capability.lazyModule(
  'ReactRoot',
  {
    provides: [Capabilities.ReactRoot],
    /** Maps the plugin's configured tour steps to the body's props. */
    props: (options: { helpSteps?: Tour.Step[] }) => options.helpSteps,
  },
  () => import('./react-root'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const SupportSettings = Capability.lazyModule(
  'SupportSettings',
  { provides: [AppCapabilities.Settings, SupportCapabilities.Settings] },
  () => import('./settings'),
);
