//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { SpaceCapabilities, SpaceCapability, type SpacePluginOptions } from '#types';

import { SpaceOperationConfig } from '../operations/helpers';
import { makeCreateInvitationUrl } from './helpers';

export * from './app-graph-builder';
export { makeCreateObjectEntryForDatabaseType } from '../util';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const IdentityCreated = Capability.lazyModule(
  'IdentityCreated',
  {
    requires: [ClientCapabilities.Client],
    provides: [SpaceCapabilities.PersonalSpace],
    // Runtime event: the personal space is created when a local identity is created, not at startup.
    activatesOn: ClientEvents.IdentityCreated,
  },
  () => import('./identity-created'),
);
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  {
    requires: [ClientCapabilities.Client],
    provides: [AppCapabilities.NavigationTargetResolver, AppCapabilities.NavigationPathResolver],
  },
  () => import('./navigation-resolver'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  props: (options: SpacePluginOptions) => ({ createInvitationUrl: makeCreateInvitationUrl(options) }),
});
export const Repair = Capability.lazyModule(
  'Repair',
  {
    provides: [SpaceCapabilities.Repair],
    // Runtime event: repairs run once spaces are observed, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./repair'),
);
export const SpaceSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SpaceCapabilities.Settings],
});
export const SpacesReady = Capability.lazyModule(
  'SpacesReady',
  {
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.AppGraph,
      Capabilities.AtomRegistry,
      AppCapabilities.Layout,
      AttentionCapabilities.Attention,
      SpaceCapabilities.State,
      SpaceCapabilities.EphemeralState,
      ClientCapabilities.Client,
    ],
    provides: [],
    // Runtime event: spaces become ready when the client observes them, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./spaces-ready'),
);
export const SpaceState = Capability.lazyModule(
  'SpaceState',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.PluginManager],
    provides: [SpaceCapabilities.State, SpaceCapabilities.EphemeralState],
  },
  () => import('./state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  provides: [SpaceOperationConfig],
  props: (options: SpacePluginOptions) => ({
    createInvitationUrl: makeCreateInvitationUrl(options),
    observability: options.observability,
  }),
});
