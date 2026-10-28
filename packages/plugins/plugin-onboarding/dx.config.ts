//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { OnboardingCapabilities, type OnboardingOptions } from './src/capabilities/capabilities.ts';
import { OnboardingNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<OnboardingOptions> = Plugin.config<OnboardingOptions>({
  plugin: {
    key: OnboardingNamespace.key,
    name: 'Onboarding',
    author: 'DXOS',
    icon: { key: 'ph--hand-waving--regular' },
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'DefaultContent',
      {
        requires: [
          Capabilities.OperationInvoker,
          AppCapabilities.AppGraph,
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
      () => import('./src/capabilities/default-content.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'MigrateDemoSpace',
      {
        requires: [ClientCapabilities.Client],
        provides: [],
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/migrate-demo-space.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'OAuthRecoveryRedirect',
      { provides: [] },
      () => import('./src/capabilities/oauth-recovery-redirect.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Onboarding',
      {
        requires: [
          AppCapabilities.AppGraph,
          Capabilities.OperationInvoker,
          AppCapabilities.Layout,
          ClientCapabilities.Client,
        ],
        provides: [OnboardingCapabilities.Onboarding, ClientCapabilities.OnIdentityDeleted],
        // The manager reads `client.halo` synchronously at construction, so it needs the forked
        // client initialization to have completed.
        activatesOn: ClientEvents.Initialized,
      },
      () => import('./src/capabilities/onboarding.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
    }),
    AppCapability.spaceTemplates(
      () => import('./src/capabilities/space-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;

export type { OnboardingOptions } from './src/capabilities/capabilities.ts';
