//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { InboxCapabilities } from '#types';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  {
    requires: [AttentionCapabilities.ViewState, ClientCapabilities.Client],
    provides: [AppCapabilities.AppGraphBuilder],
  },
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
export const Connector = Capability.lazyModule(
  'Connector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  {
    requires: [ClientCapabilities.Client],
    provides: [AppCapabilities.NavigationTargetResolver, AppCapabilities.NavigationPathResolver],
  },
  () => import('./navigation-resolver'),
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
export const InboxSettings = Capability.lazyModule(
  'InboxSettings',
  { provides: [InboxCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
