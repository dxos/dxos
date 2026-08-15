//
// GENERATED — do not edit
// AST-sliced from src/capabilities/index.ts for the 'node' environment.
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { SpaceCapabilities, SpaceCapability, SpaceSchema } from '#types';

import { SpaceOperationConfig } from '../operations/helpers';
import { makeCreateInvitationUrl } from './helpers';

export const Commands = AppCapability.commands(() => import('./commands'));

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));

export const IdentityCreated = Capability.lazyModule(
  'IdentityCreated',
  {
    requires: [ClientCapabilities.Client],
    provides: [SpaceCapabilities.DefaultSpace],
    // Runtime event: the default space is created when a local identity is created, not at startup.
    activatesOn: ClientEvents.IdentityCreated,
  },
  () => import('./identity-created'),
);

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));

export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  provides: [SpaceOperationConfig],
  props: (options: SpaceSchema.SpacePluginOptions) => ({
    createInvitationUrl: makeCreateInvitationUrl(options),
    observability: options.observability,
  }),
});

export const AppGraphBuilder = undefined;
export const NavigationHandler = undefined;
export const NavigationTargetResolver = undefined;
export const ReactRoot = undefined;
export const ReactSurface = undefined;
export const Repair = undefined;
export const Schema = undefined;
export const SpaceSettings = undefined;
export const SpaceState = undefined;
export const SpacesReady = undefined;
