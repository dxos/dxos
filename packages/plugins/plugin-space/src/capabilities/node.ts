//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { SpaceOperationConfig } from '../operations/helpers';
import * as SpaceCapabilities from '../types/SpaceCapabilities';
import * as SpaceSchema from '../types/SpaceSchema';
import { makeCreateInvitationUrl } from './helpers';

export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
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
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  {
    provides: [Capabilities.UndoMapping, SpaceOperationConfig],
    props: (options: SpaceSchema.SpacePluginOptions) => ({
      createInvitationUrl: makeCreateInvitationUrl(options),
      observability: options.observability,
    }),
  },
  () => import('./undo-mappings'),
);
