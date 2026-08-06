//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import * as ClientCapabilities from '../types/ClientCapabilities';
import * as ClientEvents from '../types/ClientEvents';
import * as ClientOptions from '../types/ClientOptions';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ClientEvents.Initialized,
});
export const Client = Capability.lazyModule(
  'Client',
  {
    // The boot root: everything downstream requires the client, and nothing pulls it in a host that
    // has not asked for it yet — so it names the startup wave rather than inheriting the idle default.
    activatesOn: ActivationEvents.Startup,
    provides: [
      ClientCapabilities.Client,
      Capabilities.Layer,
      ClientCapabilities.IdentityService,
      ClientCapabilities.SpaceService,
    ],
  },
  () => import('./client'),
);
export const LayerSpecs = AppCapability.layerSpec(() => import('./layer-specs'), { name: 'LayerSpecs' });
export const Migrations = Capability.lazyModule(
  'Migrations',
  {
    requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, ClientCapabilities.Migration],
    provides: [],
    // The immediate subscription reads `client.spaces` synchronously, so this needs the forked
    // client initialization to have completed — the same point it ran at when the startup pass
    // awaited initialize.
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./migrations'),
);
export const NavigationHandler = Capability.lazyModule(
  'NavigationHandler',
  {
    requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
    provides: [AppCapabilities.NavigationHandler],
    props: ({ invitationProp }: ClientOptions.ClientPluginOptions) => ({ invitationProp }),
  },
  () => import('./navigation-handler/navigation-handler'),
);
export type { NavigationHandlerOptions } from './navigation-handler';
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const SchemaDefs = Capability.lazyModule(
  'SchemaDefs',
  { requires: [Capabilities.AtomRegistry, ClientCapabilities.Client, AppCapabilities.Schema], provides: [] },
  () => import('./schema-defs'),
);
