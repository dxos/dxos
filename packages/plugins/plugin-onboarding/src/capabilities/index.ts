//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Client } from '@dxos/client';
// eslint-disable-next-line unused-imports/no-unused-imports
import { type OperationHandlerSet } from '@dxos/compute';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { OnboardingCapabilities } from './capabilities';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const DefaultContent = Capability.lazyModule(
  'DefaultContent',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.AppGraph,
      ClientCapabilities.Client,
      SpaceCapabilities.OnCreateSpace,
      SpaceCapabilities.PersonalSpace,
    ],
    provides: [],
    // Runtime event: the personal space exists once identity is created, not at startup.
    // `requires: [SpaceCapabilities.PersonalSpace]` orders this after plugin-space's
    // `IdentityCreated` module within the same event wave.
    activatesOn: ClientEvents.IdentityCreated,
  },
  () => import('./default-content'),
);
export const Settings = Capability.lazyModule(
  'Settings',
  { provides: [AppCapabilities.Settings] },
  () => import('./settings'),
);
export const OAuthRecoveryRedirect = Capability.lazyModule(
  'OAuthRecoveryRedirect',
  { provides: [] },
  () => import('./oauth-recovery-redirect'),
);
export const Onboarding = Capability.lazyModule(
  'Onboarding',
  {
    requires: [
      AppCapabilities.AppGraph,
      Capabilities.OperationInvoker,
      AppCapabilities.Layout,
      ClientCapabilities.Client,
    ],
    provides: [OnboardingCapabilities.Onboarding],
  },
  () => import('./onboarding'),
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

export * from './capabilities';
