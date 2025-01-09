//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework/next';
import { type Client } from '@dxos/react-client';

import { CLIENT_PLUGIN } from '../meta';

export namespace ClientCapabilities {
  export const Client = defineCapability<Client>(`${CLIENT_PLUGIN}/capabilities/client`);
}
