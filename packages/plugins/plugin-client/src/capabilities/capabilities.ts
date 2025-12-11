//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type ObjectMigration } from '@dxos/client/echo';
import { type Type } from '@dxos/echo';

import { meta } from '../meta';

export namespace ClientCapabilities {
  export const Client = defineCapability<Client>(`${meta.id}/capability/client`);
  export const Schema = defineCapability<Type.Entity.Any[]>(`${meta.id}/capability/schema`);
  export const Migration = defineCapability<ObjectMigration[]>(`${meta.id}/capability/migration`);
}
