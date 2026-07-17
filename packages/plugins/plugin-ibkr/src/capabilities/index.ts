//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { SpaceCapabilities } from '@dxos/plugin-space';

export const Connector = Capability.lazyModule(
  'IbkrConnector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const CreateObject = Capability.lazyModule(
  'IbkrCreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const OperationHandler = Capability.lazyModule(
  'IbkrOperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const AppGraphBuilder = Capability.lazyModule(
  'IbkrAppGraphBuilder',
  { requires: [AttentionCapabilities.ViewState], provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const ReactSurface = Capability.lazyModule(
  'IbkrReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const SkillDefinition = Capability.lazyModule(
  'IbkrSkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
