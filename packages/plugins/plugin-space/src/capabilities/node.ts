//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { SpaceCapabilities, type SpacePluginOptions } from '#types';

import { SpaceOperationConfig } from '../operations/helpers';
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
    props: (options: SpacePluginOptions) => ({
      createInvitationUrl: makeCreateInvitationUrl(options),
      observability: options.observability,
    }),
  },
  () => import('./undo-mappings'),
);
