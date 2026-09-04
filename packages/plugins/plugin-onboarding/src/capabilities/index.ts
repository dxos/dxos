//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { translations } from '../translations';
import { OnboardingCapabilities } from './capabilities';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const DefaultContent = Capability.lazyModule(
  'DefaultContent',
  {
    requires: [
      Capabilities.OperationInvoker,
      Capabilities.AtomRegistry,
      AppCapabilities.AppGraph,
      AppCapabilities.Layout,
      ClientCapabilities.Client,
      ClientCapabilities.SchemaRegistered,
      SpaceCapabilities.OnCreateSpace,
      SpaceCapabilities.DefaultSpace,
    ],
    provides: [],
    // Runtime event: the default space exists once identity is created, not at startup.
    // `DefaultSpace` orders this after plugin-space's `IdentityCreated` in the same wave;
    // `SchemaRegistered` pulls the idle-gated schema registration into it, for the seeded README.
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
export const Translations = AppCapability.translations(translations);
