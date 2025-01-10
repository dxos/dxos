//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework/next';

import { CLIENT_PLUGIN } from './meta';

export namespace ClientEvents {
  export const SetupClient = defineEvent(`${CLIENT_PLUGIN}/events/setup-client`);
  export const ClientReady = defineEvent(`${CLIENT_PLUGIN}/events/client-ready`);
  export const IdentityCreated = defineEvent(`${CLIENT_PLUGIN}/events/identity-created`);
  export const SpacesReady = defineEvent(`${CLIENT_PLUGIN}/events/spaces-ready`);
}
