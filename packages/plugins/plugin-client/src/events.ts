//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { CLIENT_PLUGIN } from './meta';

export namespace ClientEvents {
  export const SetupClient = defineEvent(`${CLIENT_PLUGIN}/event/setup-client`);
  export const ClientReady = defineEvent(`${CLIENT_PLUGIN}/event/client-ready`);
  export const IdentityCreated = defineEvent(`${CLIENT_PLUGIN}/event/identity-created`);
  export const SpacesReady = defineEvent(`${CLIENT_PLUGIN}/event/spaces-ready`);
}
