//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type ObjectMigration } from '@dxos/client/echo';
import { type TypedObject } from '@dxos/echo-schema';

import { CLIENT_PLUGIN } from '../meta';

export namespace ClientCapabilities {
  export const Client = defineCapability<Client>(`${CLIENT_PLUGIN}/capability/client`);
  export const Schema = defineCapability<TypedObject[]>(`${CLIENT_PLUGIN}/capability/schema`);
  export const Migration = defineCapability<ObjectMigration[]>(`${CLIENT_PLUGIN}/capability/migration`);
}
