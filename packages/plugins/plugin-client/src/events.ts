//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework/next';

import { CLIENT_PLUGIN } from './meta';

export const ClientEvents = {
  ClientReady: defineEvent(`${CLIENT_PLUGIN}/events/client-ready`),
  IdentityCreated: defineEvent(`${CLIENT_PLUGIN}/events/identity-created`),
};
