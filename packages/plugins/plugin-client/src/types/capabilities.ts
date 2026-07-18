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

import { type AccountCache as AccountCacheType } from './account-cache';

export namespace ClientCapabilities {
  export const Client = Capability.makeSingleton<Client>(`${meta.profile.key}.capability.client`);
  export const Schema = Capability.make<Type.AnyEntity[]>(`${meta.profile.key}.capability.schema`);
  export const Migration = Capability.make<ObjectMigration[]>(`${meta.profile.key}.capability.migration`);
  export const AccountCache = Capability.makeSingleton<Atom.Writable<AccountCacheType>>(
    `${meta.profile.key}.capability.accountCache`,
  );
  export const HubHttpClient = Capability.makeSingleton<HubHttpClient>(`${meta.profile.key}.capability.hubHttpClient`);
}
