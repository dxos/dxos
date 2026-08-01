//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { OnboardingCapabilities } from './capabilities';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
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
export const Settings = AppCapability.settings(() => import('./settings'));
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
    // The manager reads `client.halo` synchronously at construction, so it needs the forked
    // client initialization to have completed.
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./onboarding'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
});

export * from './capabilities';
