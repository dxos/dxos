//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type ObjectMigration } from '@dxos/client/echo';
import { type Type } from '@dxos/echo';
import { type HubHttpClient } from '@dxos/edge-client';

import { meta } from '#meta';

import { type AccountCache as AccountCacheType } from '../state/account-cache';

export namespace ClientCapabilities {
  export const Client = Capability.make<Client>(`${meta.id}.capability.client`);
  export const Schema = Capability.make<Type.AnyEntity[]>(`${meta.id}.capability.schema`);
  export const Migration = Capability.make<ObjectMigration[]>(`${meta.id}.capability.migration`);
  export const AccountCache = Capability.make<Atom.Writable<AccountCacheType>>(`${meta.id}.capability.accountCache`);
  export const HubHttpClient = Capability.make<HubHttpClient>(`${meta.id}.capability.hubHttpClient`);
}
