//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
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
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ObservabilityMappings = Capability.lazyModule(
  'ObservabilityMappings',
  {
    provides: [Capabilities.ObservabilityMapping],
    props: (options: SpaceSchema.SpacePluginOptions) => ({ observability: options.observability }),
  },
  () => import('./observability-mappings'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  {
    provides: [Capabilities.UndoMapping, SpaceOperationConfig],
    props: (options: SpaceSchema.SpacePluginOptions) => ({
      createInvitationUrl: makeCreateInvitationUrl(options),
    }),
  },
  () => import('./undo-mappings'),
);
