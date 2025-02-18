//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type TypedObject } from '@dxos/echo-schema';
import { type Client } from '@dxos/react-client';

import { CLIENT_PLUGIN } from '../meta';

export namespace ClientCapabilities {
  export const Client = defineCapability<Client>(`${CLIENT_PLUGIN}/capability/client`);
  export const Schema = defineCapability<TypedObject[]>(`${CLIENT_PLUGIN}/capability/schema`);
  // TODO(wittjosiah): Rename this. Reserve "system" nomenclature for internal use.
  export const SystemSchema = defineCapability<TypedObject[]>(`${CLIENT_PLUGIN}/capability/system-schema`);
}
